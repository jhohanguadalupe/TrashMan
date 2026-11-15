// TIERRA: manchas de barro/pasto seco, piedritas y humedad. Para suelo de bosque y orillas.
Shader "TrashMan/Dirt"
{
    Properties
    {
        _ColorA ("Tierra clara",  Color) = (0.48, 0.34, 0.22, 1)
        _ColorB ("Tierra oscura", Color) = (0.27, 0.18, 0.11, 1)
        _ColorGrass ("Pasto seco", Color) = (0.38, 0.42, 0.20, 1)
        _GrassAmount ("Cantidad de pasto", Range(0, 1)) = 0.25
        _Scale ("Tamano de manchas", Range(0.05, 2)) = 0.35
        _Pebbles ("Piedritas", Range(0, 1)) = 0.5
        _PebbleScale ("Tamano piedritas", Range(2, 30)) = 9
        _Wetness ("Humedad / barro", Range(0, 1)) = 0.0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows
        #pragma target 3.0
        #include "TrashManCommon.cginc"
        struct Input { float3 worldPos; };
        fixed4 _ColorA, _ColorB, _ColorGrass;
        float _GrassAmount, _Scale, _Pebbles, _PebbleScale, _Wetness;

        void surf(Input IN, inout SurfaceOutputStandard o)
        {
            float2 p = IN.worldPos.xz;
            float n1 = tm_fbm(p * _Scale);
            float n2 = tm_fbm(p * _Scale * 3.1 + 40.0);
            fixed3 c = lerp(_ColorB.rgb, _ColorA.rgb, saturate(n1 * 1.2 + (n2 - 0.5) * 0.3));
            float g = smoothstep(1.0 - _GrassAmount, 1.0 - _GrassAmount + 0.15, tm_fbm(p * _Scale * 1.7 + 90.0));
            c = lerp(c, _ColorGrass.rgb * (0.8 + n2 * 0.4), g * step(0.001, _GrassAmount));

            float3 v = tm_voronoi(p * _PebbleScale);
            float peb = smoothstep(0.30, 0.22, v.x) * step(1.0 - _Pebbles, v.z);
            fixed3 pebCol = lerp(fixed3(0.42, 0.40, 0.38), fixed3(0.62, 0.58, 0.52), v.z);
            c = lerp(c, pebCol, peb);

            c *= lerp(1.0, 0.55, _Wetness);
            o.Albedo = c;
            o.Smoothness = lerp(0.04, 0.6, _Wetness) * (1.0 - g) + peb * 0.15;
            o.Metallic = 0;
        }
        ENDCG
    }
    FallBack "Diffuse"
}
