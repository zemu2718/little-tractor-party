/* 将最终生图 PNG 编码为保留透明度的 WebP，仅优化网页传输，不重绘素材。
 * cc scripts/optimize_assets.c -ldl -o /tmp/party-image-codec
 * /tmp/party-image-codec source.png destination.webp
 * 使用系统 Cairo 与 libwebp，不引入前端依赖。 */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <dlfcn.h>
#define FN(lib,ret,name,args) ret (*name) args=dlsym(lib,#name); if(!name){fprintf(stderr,"missing %s\n",#name);return 1;}
int main(int argc,char **argv){
 if(argc!=3)return 1;
 void *c=dlopen("libcairo.so.2",RTLD_NOW),*w=dlopen("libwebp.so.7",RTLD_NOW);
 if(!c||!w){fprintf(stderr,"Cairo and libwebp required\n");return 1;}
 FN(c,void*,cairo_image_surface_create_from_png,(const char*));
 FN(c,int,cairo_surface_status,(void*));
 FN(c,int,cairo_image_surface_get_width,(void*));
 FN(c,int,cairo_image_surface_get_height,(void*));
 FN(c,int,cairo_image_surface_get_stride,(void*));
 FN(c,int,cairo_image_surface_get_format,(void*));
 FN(c,unsigned char*,cairo_image_surface_get_data,(void*));
 FN(c,void,cairo_surface_destroy,(void*));
 FN(w,size_t,WebPEncodeBGRA,(const uint8_t*,int,int,int,float,uint8_t**));
 FN(w,void,WebPFree,(void*));
 void *surface=cairo_image_surface_create_from_png(argv[1]);
 if(cairo_surface_status(surface)){fprintf(stderr,"PNG read failed\n");return 1;}
 int width=cairo_image_surface_get_width(surface),height=cairo_image_surface_get_height(surface),stride=cairo_image_surface_get_stride(surface),format=cairo_image_surface_get_format(surface);
 unsigned char *pixels=cairo_image_surface_get_data(surface);
 /* Cairo 的 BGRA 为预乘 alpha，WebP 输入需要直通 alpha。 */
 for(int y=0;y<height;y++)for(int x=0;x<width;x++){
  unsigned char *p=pixels+y*stride+x*4;
  if(format==1)p[3]=255;
  int alpha=p[3];
  if(alpha&&alpha<255)for(int k=0;k<3;k++){int v=(p[k]*255+alpha/2)/alpha;p[k]=(uint8_t)(v>255?255:v);}
 }
 uint8_t *output=NULL;size_t count=WebPEncodeBGRA(pixels,width,height,stride,90,&output);
 if(!count){fprintf(stderr,"WebP encode failed\n");return 1;}
 FILE *file=fopen(argv[2],"wb");if(!file)return 1;
 int ok=fwrite(output,1,count,file)==count;fclose(file);WebPFree(output);cairo_surface_destroy(surface);
 if(!ok)return 1;printf("%s: %d x %d, %zu bytes\n",argv[2],width,height,count);return 0;
}
