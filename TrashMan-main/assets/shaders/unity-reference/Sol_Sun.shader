// SOL: disco brillante + resplandor + rayos. Aditivo, siempre mira a la camara.
// Uso: crea un Quad (3D Object > Quad), ponle este material y alejalo en la direccion del Sol.
//      Escalalo (ej. 40x40). Si quieres que no lo tapen los objetos, deja ZTest como esta (siempre al fondo del cielo).
Shader "TrashMan/Sun"
{
    Properties
    {
        _CoreColor ("Color del disco", Color) = (1.0, 0.96, 0.80, 1)
        _GlowColor ("Color del resplandor", Color) = (1.0, 0.62, 0.22, 1)
        _CoreSize ("Tamano del disco", Range(0.05, 0.6)) = 0.18
        _GlowSize ("Tamano del resplandor", Range(1, 12)) = 4.0
        _GlowStrength ("Fuerza del resplandor", Range(0, 3)) = 1.2
        _Rays ("Cantidad de rayos", Range(0, 24)) = 12
        _RayStrength ("Fuerza de rayos", Range(0, 2)) = 0.7
        _Pulse ("Pulso", Range(0, 0.3)) = 0.06
    }
    SubShader
    {
        Tags { "Queue"="Transparent+10" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Blend One One
        ZWrite Off
        Cull Off
        ZTest LEqual

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            fixed4 _CoreColor, _GlowColor;
            float _CoreSize, _GlowSize, _GlowStrength, _Rays, _RayStrength, _Pulse;

            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; };
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; };

            v2f vert(appdata v)
            {
                v2f o;
                // billboard: el quad siempre mira a la camara, conserva la escala del objeto
                float sx = length(float3(unity_ObjectToWorld._m00, unity_ObjectToWorld._m10, unity_ObjectToWorld._m20));
                float sy = length(float3(unity_ObjectToWorld._m01, unity_ObjectToWorld._m11, unity_ObjectToWorld._m21));
                float4 center = mul(UNITY_MATRIX_V, float4(unity_ObjectToWorld._m03_m13_m23, 1.0));
                center.xy += v.vertex.xy * float2(sx, sy);
                o.pos = mul(UNITY_MATRIX_P, center);
                o.uv = v.uv * 2.0 - 1.0;
                return o;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                float r = length(i.uv);
                float pulse = 1.0 + sin(_Time.y * 1.3) * _Pulse;
                float core = smoothstep(_CoreSize * pulse, _CoreSize * pulse - 0.04, r);
                float glow = exp(-pow(r * (_GlowSize * 0.5), 1.6)) * _GlowStrength;
                float ang = atan2(i.uv.y, i.uv.x);
                float rays = pow(abs(cos(ang * _Rays * 0.5 + _Time.y * 0.08)), 10.0) * exp(-r * 3.2) * _RayStrength;
                float fade = saturate(1.0 - r);                            // se apaga en el borde del quad
                fixed3 col = _CoreColor.rgb * core * 1.6
                           + _GlowColor.rgb * (glow + rays) * fade;
                return fixed4(col * fade, 1);
            }
            ENDCG
        }
    }
}
