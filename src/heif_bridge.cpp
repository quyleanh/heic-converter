#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <libheif/heif.h>
#include <vector>
#include <cstring>
using emscripten::val;
val decodeHeifToRgba(val input){const unsigned n=input["length"].as<unsigned>();std::vector<uint8_t> encoded(n);val memoryView=val(emscripten::typed_memory_view(n,encoded.data()));memoryView.call<void>("set",input);
 heif_context* ctx=heif_context_alloc();auto err=heif_context_read_from_memory_without_copy(ctx,encoded.data(),encoded.size(),nullptr);if(err.code!=heif_error_Ok){heif_context_free(ctx);throw std::runtime_error(err.message);}heif_image_handle* h=nullptr;err=heif_context_get_primary_image_handle(ctx,&h);if(err.code!=heif_error_Ok){heif_context_free(ctx);throw std::runtime_error(err.message);}heif_image* img=nullptr;err=heif_decode_image(h,&img,heif_colorspace_RGB,heif_chroma_interleaved_RGBA,nullptr);if(err.code!=heif_error_Ok){heif_image_handle_release(h);heif_context_free(ctx);throw std::runtime_error(err.message);}int stride=0;const uint8_t* p=heif_image_get_plane_readonly(img,heif_channel_interleaved,&stride);const int w=heif_image_handle_get_width(h),height=heif_image_handle_get_height(h);std::vector<uint8_t> rgba((size_t)w*height*4);for(int y=0;y<height;y++)std::memcpy(rgba.data()+(size_t)y*w*4,p+(size_t)y*stride,(size_t)w*4);val out=val::object();out.set("width",w);out.set("height",height);out.set("data",val(emscripten::typed_memory_view(rgba.size(),rgba.data())));heif_image_release(img);heif_image_handle_release(h);heif_context_free(ctx);return out;}
EMSCRIPTEN_BINDINGS(heic_local){emscripten::function("decodeHeifToRgba",&decodeHeifToRgba);}
