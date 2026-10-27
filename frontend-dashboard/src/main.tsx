import React,{useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Table,TableHeader,TableBody,TableHead,TableRow,TableCell} from '@/components/ui/table'
import {Badge} from '@/components/ui/badge'
import shell from './shell.json'
import './style.css'
import './audit.css'
type ShellNode=string|{tag:string,props:Record<string,any>,children:ShellNode[]}
// Static React shell owns the shadcn primitives. The established audit controller
// owns the explicitly empty chart/table/detail slots after mounting. No React
// state rerenders those slots, preserving data, filters and auth integrations.
function renderNode(n:ShellNode,key:number):React.ReactNode{
 if(typeof n==='string')return n
 const {tag,props,children}=n;let Component:any=tag;const p={...props,key};const cls=String(p.className||'')
 if(tag==='button'){Component=Button;p.variant=cls.includes('black')?'default':cls.includes('icon-button')||p['data-view']||cls.includes('text-button')||cls.includes('sort-button')?'ghost':'outline';p.size=cls.includes('icon-button')?'icon':'default';p.type='button';p['data-ui']='button'}
 else if(tag==='input'){Component=Input;p['data-ui']='input';p.defaultValue=p.value;delete p.value}
 else if(tag==='label'){Component=Label}
 else if(tag==='table')Component=Table
 else if(tag==='thead')Component=TableHeader
 else if(tag==='tbody')Component=TableBody
 else if(tag==='th')Component=TableHead
 else if(tag==='tr')Component=TableRow
 else if(tag==='td')Component=TableCell
 else if((tag==='article'||tag==='section')&&cls.split(' ').includes('card')){Component=Card;p['data-ui']='card'}
 else if(tag==='span'&&cls==='demo-badge')Component=Badge
 return React.createElement(Component,p,...children.map((c,i)=>renderNode(c,i)))
}
function App(){useEffect(()=>{let disposed=false;const controller=document.createElement('script');controller.src='/dashboard/dashboard.js?v=mongo-ml-2';controller.onload=()=>{if(disposed)return;const auth=document.createElement('script');auth.src='/dashboard/auth.js?v=mongo-ml-2';document.body.append(auth)};document.body.append(controller);return()=>{disposed=true}},[]);return <>{(shell as ShellNode[]).map((n,i)=>renderNode(n,i))}</>}
createRoot(document.getElementById('root')!).render(<App/>);
