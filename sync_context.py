import os
import google.generativeai as genai
import datetime

# 1. Configurar tu API Key (Reemplaza con tu llave real)
genai.configure(api_key="TU_API_KEY")

def empaquetar_proyecto(rutas, extensiones_validas):
    contenido_total = ""
    # Ignorar carpetas que consumen tokens innecesarios
    directorios_ignorados = {'.git', 'node_modules', '__pycache__', 'dist', 'build', '.venv', 'venv'}

    for ruta_base in rutas:
        for root, dirs, files in os.walk(ruta_base):
            # Filtrar carpetas ignoradas
            dirs[:] = [d for d in dirs if d not in directorios_ignorados]

            for file in files:
                # Incluir siempre los .md y las extensiones de código válidas
                if any(file.endswith(ext) for ext in extensiones_validas) or file.endswith('.md'):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            contenido = f.read()
                            contenido_total += f"\n\n{'='*50}\nARCHIVO: {filepath}\n{'='*50}\n\n"
                            contenido_total += contenido
                    except Exception as e:
                        print(f"Error leyendo {filepath}: {e}")

    return contenido_total

# 2. Definir qué vamos a leer desde la raíz del proyecto
rutas_a_escanear = ['./Backend', './Frontend', '.']
extensiones_codigo = ['.py', '.ts', '.tsx', '.json', '.yaml', '.yml', '.env.example']

print("Empaquetando archivos del proyecto...")
documento_masivo = empaquetar_proyecto(rutas_a_escanear, extensiones_codigo)
print(f"Empaquetado listo. Tamaño aproximado del texto: {len(documento_masivo)} caracteres.")

# 3. Crear el caché en la API
print("Subiendo contexto a Gemini (esto puede tardar unos segundos)...")
ttl = datetime.timedelta(minutes=60)

cache = genai.caching.CachedContent.create(
    model='models/gemini-1.5-pro-001',
    display_name='donapp-context',
    system_instruction=(
        'Eres un ingeniero de software senior y QA automation experto. '
        'Utiliza el siguiente código y arquitectura adjunta para responder '
        'a las consultas de desarrollo, refactorización y testing.'
    ),
    contents=[documento_masivo],
    ttl=ttl,
)

print(f"¡Caché creado exitosamente! Nombre: {cache.name}")