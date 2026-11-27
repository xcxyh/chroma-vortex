// Sample the original cream photograph at screen resolution. Only pigment and UV coordinates use the flow grid.
(function () {
  "use strict";
  const vertex = 'attribute vec2 pos; varying vec2 uv; void main(){uv=vec2(pos.x*.5+.5,.5-pos.y*.5);gl_Position=vec4(pos,0.,1.);}';
  const fragment = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 uv;
    uniform sampler2D coords, pigments, cream;
    uniform vec3 first, second, mixed;
    uniform float grid, pixels;
    void main(){
      vec2 cell=(uv*(grid-1.)+.5)/grid;
      vec4 flow=texture2D(coords,cell);
      vec2 origin=(vec2(flow.r,flow.b)*65280.+vec2(flow.g,flow.a)*255.)/65535.;
      vec4 field=texture2D(pigments,cell);
      #ifdef DESSERT
      vec3 color=field.rgb;
      float opacity=field.a;
      #else
      float ratio=field.r;
      vec3 color=mix(mix(first,mixed,clamp(2.*ratio,0.,1.)),second,clamp(2.*ratio-1.,0.,1.));
      float opacity=field.g;
      #endif
      vec3 sampleColor=texture2D(cream,origin).rgb;
      float luminance=dot(sampleColor, vec3(.299,.587,.114));
      float relief=clamp((luminance-.18)/.64,.28,1.16);
      float glint=smoothstep(.87,.985,luminance);
      vec2 pt=uv*2.-1.;
      float rim=1.-smoothstep(.97-2./pixels,.97,length(pt));
      vec3 surface=color*relief + vec3(.28,.235,.20)*glint;
      gl_FragColor=vec4(surface,opacity*rim);
    }`;
  window.CreamMaterial = function (canvas, image, grid, redraw, fillTextures) {
    const gl = canvas.getContext('webgl', {alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true,depth:false,stencil:false,powerPreference:'low-power'});
    if (!gl) return null;
    const bytes = grid * grid * 4;
    const uvData = new Uint8Array(bytes), paintData = new Uint8Array(bytes);
    let active = false, program, first, second, mixed, pixels;
    function initialize() {
      program=gl.createProgram();
      for(const entry of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fillTextures ? "#define DESSERT\n"+fragment : fragment]]){
        const shader=gl.createShader(entry[0]);gl.shaderSource(shader,entry[1]);gl.compileShader(shader);
        if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) { gl.deleteShader(shader);gl.deleteProgram(program);return false; }
        gl.attachShader(program,shader);gl.deleteShader(shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) {gl.deleteProgram(program);return false;}
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(program,'pos');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      ['coords','pigments','cream'].forEach((name,unit)=>{
        gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
        for (const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
        for (const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
        if(unit===2) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,grid,grid,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.uniform1i(gl.getUniformLocation(program,name),unit);
      });
      first=gl.getUniformLocation(program,'first');second=gl.getUniformLocation(program,'second');mixed=gl.getUniformLocation(program,'mixed');pixels=gl.getUniformLocation(program,'pixels');
      gl.uniform1f(gl.getUniformLocation(program,'grid'),grid);
      return gl.getError()===gl.NO_ERROR;
    }
    active=initialize();
    if (!active) return null;
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;canvas.hidden=true;redraw();});
    canvas.addEventListener('webglcontextrestored',()=>{active=initialize();redraw();});
    let lastTime=0, slow=0, dprCap=3;
    return function draw(paint,cssWidth) {
      if (!active || document.hidden || !cssWidth || cssWidth < 1) return false;
      const now=performance.now(),elapsed=now-lastTime;lastTime=now;
      if(elapsed>44&&elapsed<90) slow++;else slow=0;
      if(slow>=12){dprCap=1.75;slow=0;}
      const n=Math.max(1,Math.min(1280,Math.round(cssWidth*Math.min(dprCap,window.devicePixelRatio||1))));
      if(canvas.width!==n||canvas.height!==n){canvas.width=canvas.height=n;gl.viewport(0,0,n,n);}
      if (fillTextures) fillTextures(uvData,paintData);
      else for(let i=0;i<grid*grid;i++){
        const j=i*4, mass=paint.a[i]+paint.b[i], w=mass>.00001?1/mass:0;
        const u=Math.round(65535*Math.min(1,Math.max(0,w?paint.u[i]*w:(i%grid)/(grid-1))));
        const v=Math.round(65535*Math.min(1,Math.max(0,w?paint.v[i]*w:Math.floor(i/grid)/(grid-1))));
        uvData[j]=u>>>8;uvData[j+1]=u&255;uvData[j+2]=v>>>8;uvData[j+3]=v&255;
        paintData[j]=Math.round(255*paint.b[i]*w);paintData[j+1]=Math.min(255,Math.round(2040*mass));
      }
      [uvData,paintData].forEach((data,unit)=>{
        gl.activeTexture(gl.TEXTURE0+unit);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,grid,grid,gl.RGBA,gl.UNSIGNED_BYTE,data);
      });
      if (!fillTextures) for (const entry of [[first,paint.first],[second,paint.second],[mixed,paint.mixed]]) {
        const c=entry[1];gl.uniform3f(entry[0],c[0]/255,c[1]/255,c[2]/255);
      }
      gl.uniform1f(pixels,n);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      return true;
    };
  };
})();
