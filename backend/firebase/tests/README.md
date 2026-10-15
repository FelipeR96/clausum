# Pruebas de reglas de seguridad

Estas pruebas corren contra los **emuladores** de Firestore y Storage y
actúan como un navegador real: abren contextos autenticados con distintos
`uid` y comprueban qué deja pasar cada regla.

Son la red de seguridad más importante del repositorio. Las reglas son lo
único que separa los contratos de un usuario de los de otro, y lo único que
impide que alguien se ascienda a Pro escribiendo en su propio documento desde
la consola del navegador.

## Correr

```bash
# Con los emuladores ya arriba (pnpm dev:emulators en otra terminal)
pnpm test

# O levantando emuladores solo para la corrida (como en CI)
pnpm exec firebase emulators:exec \
  --only firestore,storage,auth \
  --config backend/firebase/firebase.json \
  --project clausum-test \
  "pnpm test"
```

## Al cambiar una regla

Añade el caso **antes** de cambiar la regla, y escribe tanto el caso que debe
pasar como el que debe fallar. Una regla que solo se prueba por el lado
permisivo no está probada: lo que importa es lo que bloquea.

Cada `it` de aquí corresponde a un ataque o a un error de programación
concreto, no a cobertura por cobertura. Si añades uno, que el nombre diga
qué se está impidiendo.
