uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;

varying float vColorIndex;

void main() {
  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
  float strength = 0.05 / distanceToCenter - 0.1;

  vec3 color = mix(uColorA, uColorB, vColorIndex);
  gl_FragColor = vec4(color, strength);
}