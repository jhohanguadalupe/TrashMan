// =============================================================================
//  TRASH MAN 3D  -  SHADER DE AGUA "RIO TURBIO"  (Unity, Built-in Render Pipeline)
//
//  Estilo arcade: agua con degradado orilla -> centro, ondas que corren por el
//  cauce, espuma en las orillas, destellos del sol y niebla del mapa.
//  Todo es procedural: NO necesita texturas.
//
//  Uso:
//   1. Pon este archivo en Assets/ (ej. Assets/Shaders/RiverWater.shader).
//   2. Crea un Material -> Shader: "TrashMan/RiverWater".
//   3. Arrastralo al campo "Water Material" del componente RiverMap.
//      (Usa las UV del agua de RiverMap: U = ancho del rio, V = largo.)
//
//  Si usas URP/HDRP este shader se ve rosa: avisame y lo paso a esa pipeline.
// =============================================================================
Shader "TrashMan/RiverWater"
{
    Properties
    {
        _ShallowColor ("Color orilla (poco profundo)", Color) = (0.30, 0.78, 0.86, 0.55)
        _DeepColor    ("Color centro (profundo)",      Color) = (0.05, 0.36, 0.62, 0.90)
        _FoamColor    ("Color espuma",                 Color) = (0.92, 0.98, 1.00, 1.00)
        _Speed        ("Velocidad corriente",  Range(0, 3))    = 0.6
        _Scale        ("Tamano de las ondas",  Range(0.5, 12)) = 4.0
        _WaveStrength ("Fuerza de las ondas",  Range(0, 2))    = 0.7
        _FoamWidth    ("Ancho espuma orilla",  Range(0, 0.4))  = 0.12
        _Shininess    ("Brillo del sol",       Range(8, 256))  = 90
        _SparkleAmount("Destellos",            Range(0, 2))    = 0.8
        _BobHeight    ("Oleaje (altura)",      Range(0, 0.2))  = 0.04
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        LOD 200
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #include "UnityCG.cginc"
            #include "UnityLightingCommon.cginc"

            fixed4 _ShallowColor, _DeepColor, _FoamColor;
            float _Speed, _Scale, _WaveStrength, _FoamWidth, _Shininess, _SparkleAmount, _BobHeight;

            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; };
            struct v2f
            {
                float4 pos : SV_POSITION;
                float2 uv  : TEXCOORD0;
                float3 wpos: TEXCOORD1;
                UNITY_FOG_COORDS(2)
            };

            // ---------- ruido de valor procedural ----------
            float hash21(float2 p)
            {
                p = frac(p * float2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return frac(p.x * p.y);
            }
            float vnoise(float2 p)
            {
                float2 i = floor(p), f = frac(p);
                f = f * f * (3.0 - 2.0 * f);
                float a = hash21(i), b = hash21(i + float2(1, 0));
                float c = hash21(i + float2(0, 1)), d = hash21(i + float2(1, 1));
                return lerp(lerp(a, b, f.x), lerp(c, d, f.x), f.y);
            }
            // altura de las ondas: dos capas que corren en el sentido del rio (Z)
            float waves(float2 p, float t)
            {
                float2 flow = float2(0, -t);
                float h  = vnoise(p * _Scale + flow);
                h += vnoise(p * _Scale * 2.1 + flow * 1.7 + 17.3) * 0.5;
                h += vnoise(p * _Scale * 0.5 + flow * 0.6 + 5.1) * 0.8;
                return h / 2.3;
            }

            v2f vert(appdata v)
            {
                v2f o;
                float3 w = mul(unity_ObjectToWorld, v.vertex).xyz;
                // oleaje suave en vertices
                v.vertex.y += sin(_Time.y * 1.6 + w.z * 0.4 + w.x * 0.7) * _BobHeight;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                o.wpos = mul(unity_ObjectToWorld, v.vertex).xyz;
                UNITY_TRANSFER_FOG(o, o.pos);
                return o;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                float t = _Time.y * _Speed;
                float2 p = i.wpos.xz;

                // normal falsa a partir del gradiente del ruido
                const float e = 0.08;
                float h  = waves(p, t);
                float hx = waves(p + float2(e, 0), t);
                float hz = waves(p + float2(0, e), t);
                float3 n = normalize(float3(-(hx - h) / e * _WaveStrength, 1.0, -(hz - h) / e * _WaveStrength));

                // profundidad falsa: centro del cauce (u = .5) = profundo
                float edge = abs(i.uv.x - 0.5) * 2.0;          // 0 centro .. 1 orilla
                float depth = 1.0 - smoothstep(0.0, 1.0, edge);
                fixed4 col = lerp(_ShallowColor, _DeepColor, depth);
                col.rgb *= 0.88 + h * 0.3;                      // variacion por ondas

                // espuma en la orilla (borde roto por ruido)
                float foamNoise = vnoise(p * 3.0 + float2(0, -t * 1.5));
                float foamEdge = smoothstep(1.0 - _FoamWidth, 1.0, edge + (foamNoise - 0.5) * 0.12);
                // espuma suelta sobre las crestas
                float crest = smoothstep(0.72, 0.9, h) * 0.5;
                float foam = saturate(foamEdge + crest);
                col.rgb = lerp(col.rgb, _FoamColor.rgb, foam);
                col.a   = saturate(lerp(col.a, 1.0, foam * 0.8));

                // sol: brillo especular + fresnel
                float3 V = normalize(_WorldSpaceCameraPos - i.wpos);
                float3 L = normalize(_WorldSpaceLightPos0.xyz);
                float3 H = normalize(L + V);
                float spec = pow(saturate(dot(n, H)), _Shininess);
                float fres = pow(1.0 - saturate(dot(n, V)), 3.0);
                col.rgb += _LightColor0.rgb * spec * 0.9;
                col.rgb = lerp(col.rgb, fixed3(0.75, 0.9, 1.0), fres * 0.35);
                col.a   = saturate(col.a + fres * 0.2);

                // destellos pequenos
                float sp = vnoise(p * 14.0 + float2(0, -t * 2.5));
                col.rgb += step(0.93, sp) * spec * 6.0 * _SparkleAmount * 0.15;

                UNITY_APPLY_FOG(i.fogCoord, col);
                return col;
            }
            ENDCG
        }
    }
    Fallback "Transparent/Diffuse"
}
