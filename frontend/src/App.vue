<script setup>
// No se necesita script aquí por ahora, a menos que quieras lógica global de App
</script>

<template>
  <div>
    <router-view />
  </div>
</template>

<style>
/* 
  Estilos globales que estaban aquí han sido comentados para permitir 
  que Tailwind CSS (importado en main.js a través de style.css) 
  maneje los estilos base y las utilidades.
  Si necesitas estilos globales muy específicos, considera si pueden 
  ser manejados por Tailwind o añádelos con precaución en style.css.
*/

/*
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f4f7f9; 
  color: #333;
}

#app {
  
}
*/
</style>
