// Sauce RGB, sauce coverage and material coordinates travel together when the spoon moves.
(() => {
  const N=104, S=6, end=N-1;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  class DessertCream {
    constructor(flat,surface,redraw) {
      this.flat=flat;this.surface=surface;this.ctx=flat.getContext("2d");
      this.field=new Float32Array(N*N*S);
      this.work=new Float32Array(this.field.length);
      this.setBase("#fff0ce");this.clear();
      window.CupPhotos.ready("cream").then(photo=>{
        const copy=document.createElement("canvas");copy.width=copy.height=768;
        const ctx=copy.getContext("2d");
        try {ctx.drawImage(photo,0,0,768,768);this.texture=ctx.getImageData(0,0,768,768).data;} catch(error) {}
        try {this.gpu=window.CreamMaterial(surface,photo,N,redraw,(uv,rgba)=>this.pack(uv,rgba));} catch(error) {}
        redraw();
      }).catch(()=>{redraw();});
    }
    setBase(hex){this.base=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
    clear(){
      this.field.fill(0);
      for(let i=0;i<N*N;i++){this.field[i*S+4]=(i%N)/end;this.field[i*S+5]=Math.floor(i/N)/end;}
    }
    drizzle(hex,portion) {
      const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
      const angle=portion*2.399+.3,cos=Math.cos(angle),sin=Math.sin(angle),f=this.field;
      for(let y=0;y<N;y++)for(let x=0;x<N;x++){
        const px=x/end-.5,py=y/end-.5,u=px*cos+py*sin,v=-px*sin+py*cos;
        const curve=.23*Math.sin(u*8+.55)+.04*Math.sin(u*18);
        const width=.025+.019*Math.cos(u*9);
        const opacity=clamp((width-Math.abs(v-curve))*end+.5,0,1)*clamp((.43-Math.abs(u))*30,0,1)*.93;
        if(!opacity)continue;
        const j=(y*N+x)*S;
        for(let k=0;k<3;k++) f[j+k]=f[j+k]*(1-opacity)+rgb[k]*opacity;
        f[j+3]=f[j+3]*(1-opacity)+opacity;
      }
    }
    stir(from,to){
      const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy);
      if(len<.002)return;
      const steps=Math.ceil(len/.035);
      for(let step=1;step<=steps;step++){
        const px=from.x+dx*step/steps,py=from.y+dy*step/steps;
        const f=this.field,tmp=this.work,r=.23;
        const left=Math.max(0,Math.floor((px-r)*end)),right=Math.min(end,Math.ceil((px+r)*end));
        const top=Math.max(0,Math.floor((py-r)*end)),bottom=Math.min(end,Math.ceil((py+r)*end));
        for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
          const sx=x/end-px,sy=y/end-py,weight=Math.max(0,1-(sx*sx+sy*sy)/(r*r));
          const pull=weight*weight*1.32/steps;
          const u=clamp(x-dx*pull*end,0,end-.0001),v=clamp(y-dy*pull*end,0,end-.0001);
          const ix=Math.floor(u),iy=Math.floor(v),a=u-ix,b=v-iy,j=(y*N+x)*S,q=(iy*N+ix)*S;
          for(let k=0;k<S;k++)tmp[j+k]=(1-b)*((1-a)*f[q+k]+a*f[q+S+k])+b*((1-a)*f[q+N*S+k]+a*f[q+(N+1)*S+k]);
        }
        for(let y=top;y<=bottom;y++){const a=(y*N+left)*S,b=(y*N+right+1)*S;f.set(tmp.subarray(a,b),a);}
      }
    }
    pack(uv,rgba){
      const f=this.field;
      for(let i=0;i<N*N;i++){
        const j=i*S,k=i*4,u=Math.round(f[j+4]*65535),v=Math.round(f[j+5]*65535);
        uv[k]=u>>>8;uv[k+1]=u&255;uv[k+2]=v>>>8;uv[k+3]=v&255;
        for(let c=0;c<3;c++)rgba[k+c]=Math.round(clamp(f[j+c]+(1-f[j+3])*this.base[c],0,255));
        rgba[k+3]=255;
      }
    }
    render(){
      const w=this.flat.clientWidth;if(!w)return;
      if(this.gpu && this.gpu(this,w)){this.surface.hidden=false;return;}
      this.surface.hidden=true;
      const n=Math.min(640,Math.max(1,Math.round(w*Math.min(window.devicePixelRatio||1,2))));
      if(!this.image || this.flat.width!==n){this.flat.width=this.flat.height=n;this.image=this.ctx.createImageData(n,n);}
      const out=this.image.data,f=this.field,tex=this.texture;
      for(let y=0;y<n;y++)for(let x=0;x<n;x++){
        const u=(x+.5)/n*end,v=(y+.5)/n*end,i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j;
        const k=(j*N+i)*S,p=(y*n+x)*4;
        const tl=(1-a)*(1-b),tr=a*(1-b),bl=(1-a)*b,br=a*b;
        const sample=c=>tl*f[k+c]+tr*f[k+S+c]+bl*f[k+N*S+c]+br*f[k+(N+1)*S+c];
        const milk=1-sample(3),q=4*(768*Math.round(sample(5)*767)+Math.round(sample(4)*767));
        const lum=tex?(.299*tex[q]+.587*tex[q+1]+.114*tex[q+2])/255:.82;
        const relief=clamp((lum-.18)/.64,.28,1.16),gloss=clamp((lum-.87)/.115,0,1);
        for(let c=0;c<3;c++)out[p+c]=(sample(c)+milk*this.base[c])*relief+gloss*gloss*(3-2*gloss)*[71,60,51][c];
        out[p+3]=255;
      }
      this.ctx.putImageData(this.image,0,0);
    }
    capture(){this.render();return this.surface.hidden?this.flat:this.surface;}
  }
  window.DessertCream=DessertCream;
})();
