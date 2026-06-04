# Simulación Numérica de Crisis — Métodos Numéricos

## Descripción
Página web interactiva que aplica métodos numéricos para modelar y simular problemas reales relacionados con abastecimiento, precios y conflicto social.

## Escenarios implementados
| Escenario | Tema | Métodos |
|-----------|------|---------|
| A | Optimización de abastecimiento y red de transporte | Jacobi, Gauss-Seidel, LU, SOR |
| B | Vaciado crítico de reservas de carburante | Euler, Heun, Runge-Kutta 4 |
| C | Curva continua de precios de alimentos | Lagrange, Newton, Splines Cúbicos |
| D | Costo acumulado y pérdida del poder adquisitivo | Trapecio, Simpson 1/3, Simpson 3/8 |
| E | Umbrales críticos de abastecimiento | Bisección, Newton-Raphson, Secante |
| F | Rumores y pánico en la red de distribución | Sistemas mal condicionados, Número de condición |
| G | Modelo de difusión de descontento social | Heun, Runge-Kutta 4 (sistema de EDO) |

## Cómo usar
1. Abre `index.html` en tu navegador (o publica en GitHub Pages / Netlify)
2. Navega por los escenarios usando el menú lateral
3. Modifica los parámetros en cada escenario
4. Presiona **▶ Ejecutar** para ver resultados, gráficos y respuestas a las preguntas

## Tecnologías
- HTML5, CSS3, JavaScript (ES6+)
- Chart.js 4.4.1 (gráficos)
- Google Fonts (Sora, JetBrains Mono)

## Publicación
Para publicar en GitHub Pages:
1. Sube los archivos a un repositorio GitHub
2. Ve a Settings → Pages → Source: main branch
3. Tu página estará en `https://usuario.github.io/repositorio/`
