"use client";
import { useEffect,useRef,useState,type PointerEvent,type MouseEvent,type KeyboardEvent,type RefObject } from "react";

type Options={
  panelRef:RefObject<HTMLElement|null>;
  index:number;
  count:number;
  getHeights:(panel:HTMLElement)=>readonly number[];
  onSnap:(index:number)=>void;
  enabled?:boolean;
  onTap?:()=>void;
};
type Drag={id:number;y:number;lastY:number;lastTime:number;velocity:number;height:number;index:number;min:number;max:number;moved:boolean};

/** Shared vertical sheet gesture. Only the handle owns the pointer; content and
 * map keep their native scrolling/panning. Height follows the finger, then snaps. */
export function useSheetSwipe({panelRef,index,count,getHeights,onSnap,enabled=true,onTap}:Options){
  const [dragHeight,setDragHeight]=useState<number|null>(null);
  const drag=useRef<Drag|null>(null);
  const ignoreClick=useRef(false);
  useEffect(()=>{
    if(!enabled){drag.current=null;ignoreClick.current=false;setDragHeight(null);}
  },[enabled]);
  const clampIndex=(i:number)=>Math.max(0,Math.min(count-1,i));
  function start(e:PointerEvent<HTMLButtonElement>){
    const panel=panelRef.current;
    if(!enabled||!panel||!e.isPrimary||(e.pointerType==="mouse"&&e.button!==0))return;
    ignoreClick.current=false;
    const heights=getHeights(panel);
    const cssMax=Number.parseFloat(getComputedStyle(panel).maxHeight);
    const cap=Number.isFinite(cssMax)?cssMax:Infinity;
    const max=Math.min(cap,Math.max(...heights));
    const min=Math.min(max,Math.min(...heights));
    drag.current={id:e.pointerId,y:e.clientY,lastY:e.clientY,lastTime:performance.now(),velocity:0,height:panel.getBoundingClientRect().height,index,min,max,moved:false};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e:PointerEvent<HTMLButtonElement>){
    const d=drag.current;
    if(!d||d.id!==e.pointerId)return;
    const now=performance.now(),delta=d.y-e.clientY;
    if(now>d.lastTime){
      const speed=(d.lastY-e.clientY)/(now-d.lastTime);
      d.velocity=.65*speed+.35*d.velocity;
    }
    d.lastY=e.clientY;d.lastTime=now;
    if(Math.abs(delta)<5&&!d.moved)return;
    d.moved=true;ignoreClick.current=true;
    setDragHeight(Math.max(d.min,Math.min(d.max,d.height+delta)));
  }
  function finish(e:PointerEvent<HTMLButtonElement>,cancelled=false){
    const d=drag.current;
    if(!d||d.id!==e.pointerId)return;
    drag.current=null;
    const delta=d.y-e.clientY;
    const velocity=performance.now()-d.lastTime<100?d.velocity:0;
    if(d.moved){
      ignoreClick.current=true;
      if(!cancelled&&(Math.abs(delta)>32||Math.abs(velocity)>.35)){
        const direction=Math.abs(velocity)>.35?Math.sign(velocity):Math.sign(delta);
        onSnap(clampIndex(d.index+direction));
      }
    }
    setDragHeight(null);
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  }
  return {dragHeight,handleProps:{
    onPointerDown:start,onPointerMove:move,
    onPointerUp:(e:PointerEvent<HTMLButtonElement>)=>finish(e),
    onPointerCancel:(e:PointerEvent<HTMLButtonElement>)=>finish(e,true),
    onLostPointerCapture:(e:PointerEvent<HTMLButtonElement>)=>finish(e,true),
    onClick:(e:MouseEvent<HTMLButtonElement>)=>{
      if(ignoreClick.current&&e.detail!==0){ignoreClick.current=false;return;}
      ignoreClick.current=false;
      if(onTap)onTap();else onSnap(index===count-1?0:index+1);
    },
    onKeyDown:(e:KeyboardEvent<HTMLButtonElement>)=>{
      if(e.key==="ArrowUp"||e.key==="ArrowDown"){
        e.preventDefault();onSnap(clampIndex(index+(e.key==="ArrowUp"?1:-1)));
      }
    }
  }};
}
