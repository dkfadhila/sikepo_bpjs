"""Offline synthetic-only novelty detector. No network, patient data, or LLM training."""
import hashlib, json, math, platform
from pathlib import Path
import numpy as np
import sklearn
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score, confusion_matrix, precision_recall_fscore_support, roc_auc_score

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'data/synthetic/claims.json'
dataset = json.loads(source.read_text(encoding='utf-8'))
claims = dataset['claims']
FEATURES = ['cost_ratio','los_ratio','missing_drug_evidence','service_gap_ratio','invoice_gap_ratio','duplicate_count','log_tariff']
def features(c):
    return [c['amount']/c['tariff'], c['los']/c['normalLos'], int(c['restrictedDrug'] and not c['drugEvidence']),
            abs(c['serviceCount']-c['documentedServiceCount'])/max(1,c['serviceCount']),
            abs(c['invoiceTotal']-c['amount'])/max(1,c['amount']), c['duplicateCount'], math.log1p(c['tariff'])]

# Entire episodes stay in one split; IDs are used only for splitting, never as features.
def split(c):
    n = int(hashlib.sha256(('2702026:'+c['episodeId']).encode()).hexdigest()[:8],16) % 100
    return 'train' if n < 70 else 'validation' if n < 85 else 'test'
X = np.asarray([features(c) for c in claims], dtype=np.float32)
splits = np.asarray([split(c) for c in claims])
# Independent evaluation label: any condition injected into the observed record.
y = np.asarray([int(c['duplicateCount']>1 or c['restrictedDrug'] and not c['drugEvidence'] or
                    c['serviceCount']!=c['documentedServiceCount'] or c['invoiceTotal']!=c['amount'] or
                    c['amount']/c['tariff']>1.3 or c['los']>c['normalLos']+2) for c in claims])
train = splits=='train'
model = IsolationForest(n_estimators=120,max_samples=256,contamination='auto',random_state=2702026,n_jobs=1)
model.fit(X[train])
raw = -model.score_samples(X)
calibration = raw[(splits=='validation') & (y==0)]
threshold = float(np.quantile(calibration,.95))
pred = raw > threshold
mask = splits=='test'
p,r,f,_ = precision_recall_fscore_support(y[mask],pred[mask],average='binary',zero_division=0)
report = {'modelVersion':'iforest-synthetic-2.0','algorithm':'IsolationForest','features':FEATURES,
 'seed':2702026,'datasetVersion':dataset['metadata']['version'],'datasetSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'python':platform.python_version(),'sklearn':sklearn.__version__,
 'splitCounts':{s:int(np.sum(splits==s)) for s in ['train','validation','test']},'fitRows':int(train.sum()),
 'fitMethod':'Unsupervised fit on all training rows; injected labels excluded from features and fit',
 'splitMethod':'SHA256 of episodeId with fixed seed, 70/15/15; no episode crosses splits',
 'thresholdMethod':'95th percentile of validation baseline anomaly scores only','threshold':threshold,
 'test':{'rows':int(mask.sum()),'precision':float(p),'recall':float(r),'f1':float(f),
         'rocAuc':float(roc_auc_score(y[mask],raw[mask])),'averagePrecision':float(average_precision_score(y[mask],raw[mask])),
         'confusionMatrixTN_FP_FN_TP':confusion_matrix(y[mask],pred[mask]).ravel().tolist()},
 'limitations':['Synthetic-only evaluation, not clinical or BPJS validation','Injected scenario labels are not confirmed fraud',
               'No automatic approval, rejection, or payment','No patient age or identity used as features']}
trees = []
for estimator in model.estimators_:
    t=estimator.tree_
    trees.append({'left':t.children_left.tolist(),'right':t.children_right.tolist(),'feature':t.feature.tolist(),
                  'threshold':t.threshold.tolist(),'samples':t.n_node_samples.tolist()})
artifact={'version':report['modelVersion'],'features':FEATURES,'maxSamples':int(model.max_samples_),
          'threshold':threshold,'trees':trees,'report':report}
out=ROOT/'artifacts/local-experiment';out.mkdir(parents=True,exist_ok=True)
(out/'isolation-forest.json').write_text(json.dumps(artifact,separators=(',',':'))+'\n',encoding='utf-8')
(out/'evaluation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
# Independent Python scores allow testing exact exported-tree inference in Node.
(out/'parity-fixtures.json').write_text(json.dumps([{'id':claims[i]['id'],'features':features(claims[i]),'rawScore':float(raw[i])} for i in range(0,len(claims),97)],indent=2)+'\n',encoding='utf-8')
(out/'splits.json').write_text(json.dumps([{'id':c['id'],'episodeId':c['episodeId'],'split':str(s)} for c,s in zip(claims,splits)],separators=(',',':'))+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
