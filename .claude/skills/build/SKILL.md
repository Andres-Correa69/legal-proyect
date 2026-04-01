---
name: build
description: Compila el frontend con Vite y reporta errores. Usar despues de cambios en archivos .tsx/.ts/.css
disable-model-invocation: true
allowed-tools: Bash
---

Ejecuta `npx vite build` en el directorio del proyecto y analiza el resultado:

1. Si compila exitosamente, reporta el tiempo de build y si hay warnings relevantes (ignora chunk size warnings)
2. Si hay errores de TypeScript, identifica el archivo y linea exacta, lee el archivo afectado, y sugiere la correccion
3. Si hay errores de importacion, verifica que el modulo/componente exista con Glob
4. Nunca hagas cambios automaticamente — solo reporta y sugiere
