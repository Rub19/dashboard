#include <metal_stdlib>
using namespace metal;

[[ stitchable ]]
half4 liquidGlassColor(float2 position, half4 color, float2 tilt) {
    float2 dir = normalize(tilt + float2(0.001));
    half sheen = half(0.08 + 0.12 * max(0.0, dot(normalize(position), dir)));
    half3 lit = color.rgb + half3(sheen);
    return half4(lit, color.a);
}

[[ stitchable ]]
float2 liquidGlassDistortion(float2 position, float2 tilt) {
    float amount = length(tilt) * 0.15;
    float2 offset = normalize(tilt + float2(0.001)) * amount;
    return position + offset;
}
