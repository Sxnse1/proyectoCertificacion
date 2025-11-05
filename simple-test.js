// Script de prueba simple para lógica de completado
const videoDuration = 300; // 5 minutos
const threshold = videoDuration * 0.98; // 98%

console.log('🧪 Prueba de lógica de completado de video');
console.log(`📹 Duración: ${videoDuration} segundos`);
console.log(`🎯 Umbral 98%: ${threshold} segundos`);
console.log('');

const testCases = [
    { seconds: 30, desc: "10%" },
    { seconds: 150, desc: "50%" },
    { seconds: 270, desc: "90%" },
    { seconds: 294, desc: "98% - DEBE COMPLETAR" },
    { seconds: 300, desc: "100%" }
];

testCases.forEach(test => {
    const isComplete = test.seconds >= threshold;
    const percentage = ((test.seconds / videoDuration) * 100).toFixed(1);
    const icon = isComplete ? '✅' : '⏳';
    
    console.log(`${icon} ${test.desc}: ${test.seconds}s (${percentage}%) → Completado: ${isComplete}`);
});

console.log('\n🚀 Prueba manual:');
console.log('1. Ir a http://localhost:3000/video/1');
console.log('2. En DevTools Console: window.videoDuration = 300');
console.log('3. Simular progreso: window.currentVideoId y observar fetch calls');