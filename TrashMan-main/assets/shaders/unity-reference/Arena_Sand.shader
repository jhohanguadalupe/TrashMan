// ARENA: dunas con ondulaciones, granos y brillitos. Para playa / lecho del rio.
Shader "TrashMan/Sand"
{
    Properties
    {
        _ColorLight ("Arena clara",  Color) = (0.90, 0.82, 0.62, 1)
        _ColorDark  ("Arena oscura", Color) = (0.72, 0.60, 0.40, 1)
        _DuneScale  ("Tamano de dunas", Range(0.02, 1)) = 0.18
        _Ripple     ("Fuerza de ondulaciones", Range(0, 1)) = 0.5
        _GrainScale ("Tamano de granos", Range(2, 60)) = 24
        _Sparkle    ("Brillitos", Range(0, 1)) = 0.35
        _Wet        ("Humedad (orilla)", Range(0, 1)) = 0.0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows
        #pragma target 3.0
        #include "TrashManCommon.cginc"
        struct Input { float3 worldPos; };
        fixed4 _ColorLight, _ColorDark;
        float _DuneScale, _Ripple, _GrainScale, _Sparkle, _Wet;

        void surf(Input IN, inout SurfaceOutputStandard o)
        {
            float2 p = IN.worldPos.xz;
            float warp = tm_fbm(p * _DuneScale * 1.7) * 6.0;
            float ripple = sin((p.x * 0.9 + p.y * 0.4 + warp) * 3.0) * 0.5 + 0.5;
            float dune = tm_fbm(p * _DuneScale);
            float grain = tm_vnoise(p * _GrainScale);
            float t = saturate(dune * 0.7 + ripple * _Ripple * 0.5 + (grain - 0.5) * 0.18);
            fixed3 c = lerp(_ColorDark.rgb, _ColorLight.rgb, t);
            float spark = step(0.965, tm_hash21(floor(p * _GrainScale * 1.5)));
            c += spark * _Sparkle * 0.5;
            c *= lerp(1.0, 0.62, _Wet);                       // arena mojada = mas oscura
            o.Albedo = c;
            o.Smoothness = lerp(0.05, 0.55, _Wet) + spark * 0.3;
            o.Metallic = 0;
        }
        ENDCG
    }
    FallBack "Diffuse"
}
