// ROCA: estratos, grietas y musgo en las caras que miran hacia arriba. Para rocas, acantilados y colinas.
Shader "TrashMan/Rock"
{
    Properties
    {
        _ColorA ("Roca clara",  Color) = (0.50, 0.55, 0.62, 1)
        _ColorB ("Roca oscura", Color) = (0.24, 0.28, 0.35, 1)
        _Strata ("Estratos (capas)", Range(0.2, 8)) = 2.2
        _Scale  ("Tamano del detalle", Range(0.1, 4)) = 0.9
        _Cracks ("Grietas", Range(0, 1)) = 0.6
        _MossColor ("Color musgo", Color) = (0.28, 0.45, 0.20, 1)
        _Moss ("Musgo arriba", Range(0, 1)) = 0.35
        _Smooth ("Brillo", Range(0, 1)) = 0.18
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows
        #pragma target 3.0
        #include "TrashManCommon.cginc"
        struct Input { float3 worldPos; float3 worldNormal; };
        fixed4 _ColorA, _ColorB, _MossColor;
        float _Strata, _Scale, _Cracks, _Moss, _Smooth;

        void surf(Input IN, inout SurfaceOutputStandard o)
        {
            float3 wp = IN.worldPos;
            float3 n = normalize(IN.worldNormal);
            // coordenada horizontal segun la cara (aprox. triplanar)
            float h = abs(n.x) > abs(n.z) ? wp.z : wp.x;
            float2 q = float2(h, wp.y);
            float2 top = wp.xz;
            float2 uv = n.y > 0.7 ? top : q;

            float band = tm_fbm(float2(uv.x * 0.25 * _Scale, uv.y * _Strata + tm_fbm(uv * _Scale) * 1.4));
            fixed3 c = lerp(_ColorB.rgb, _ColorA.rgb, smoothstep(0.25, 0.75, band));
            c *= 0.85 + 0.3 * tm_vnoise(uv * 8.0 * _Scale);

            float3 v = tm_voronoi(uv * 2.2 * _Scale);
            float crack = smoothstep(0.07, 0.0, v.y - v.x) * _Cracks;
            c *= 1.0 - crack * 0.65;

            float up = saturate(n.y);
            float mossMask = smoothstep(0.55, 0.9, up) * smoothstep(1.0 - _Moss, 1.0, tm_fbm(wp.xz * 0.9 + 7.0) + up * 0.35);
            c = lerp(c, _MossColor.rgb * (0.8 + 0.4 * tm_vnoise(wp.xz * 6.0)), mossMask * step(0.001, _Moss));

            o.Albedo = c;
            o.Smoothness = _Smooth * (1.0 - mossMask);
            o.Metallic = 0;
        }
        ENDCG
    }
    FallBack "Diffuse"
}
