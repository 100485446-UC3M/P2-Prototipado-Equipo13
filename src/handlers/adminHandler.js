const fs = require('fs').promises;
const credentials = 'DataBases/credentials.json';

//Registrar nuevo admin
async function addAdminCredential(data){
    // Validación básica de entrada
    if (!data.username || typeof data.username !== 'string' || data.username.trim() === '') {
        console.error("Error al añadir admin: El nombre de usuario no puede estar vacío.");
        return false;
    }
    if (data.password === undefined || data.password === null || String(data.password).trim() === '') {
        console.error(`Error al añadir admin '${data.username}': La contraseña no puede estar vacía.`);
        return false;
    }
    // Evitar añadir "Admins" o "Users" como usernames si causa confusión
    if (data.username === 'Admins' || data.username === 'Users') {
        console.error(`Error al añadir admin: '${data.username}' es una clave reservada.`);
        return false;
    }

    let allCredentials;

    try {
        let fileContent;
        try {
            fileContent = await fs.readFile(CREDENTIALS_FILE_PATH, 'utf-8');
        } catch (readError) {
            if (readError.code === 'ENOENT') {
                // Si el archivo no existe
                console.log(`Archivo ${path.basename(CREDENTIALS_FILE_PATH)} no encontrado. Creando estructura base.`);
                allCredentials = { Admins: {}, Users: {} };
                // Continuamos para añadir el primer admin
            } else {
                // Otro error de lectura es fatal
                console.error(`Error fatal al leer el archivo de credenciales: ${readError.message}`);
                return false;
            }
        }

        // Si leímos contenido, intentamos parsearlo
        if (fileContent) {
            if (fileContent.trim() === '') {
                // Si existe pero está vacío, inicializar estructura
                console.log(`Archivo ${path.basename(CREDENTIALS_FILE_PATH)} está vacío. Inicializando estructura.`);
                allCredentials = { Admins: {}, Users: {} };
            } else {
                // Parsear el contenido existente
                allCredentials = JSON.parse(fileContent);

                // Validar estructura mínima después de parsear
                if (!allCredentials || typeof allCredentials !== 'object') {
                    console.error(`Error: El contenido de ${path.basename(CREDENTIALS_FILE_PATH)} no es un objeto JSON válido.`);
                    return false;
                }
                // Asegurarse de que Admins y Users existan como objetos, si no, inicializarlos
                if (typeof allCredentials.Admins !== 'object' || allCredentials.Admins === null) {
                    console.warn("La clave 'Admins' no existe o no es un objeto. Inicializando.");
                    allCredentials.Admins = {};
                }
                if (typeof allCredentials.Users !== 'object' || allCredentials.Users === null) {
                    console.warn("La clave 'Users' no existe o no es un objeto. Inicializando.");
                    allCredentials.Users = {};
                }
            }
        }

        // Verificar si el administrador ya existe 
        if (allCredentials.Admins.hasOwnProperty(data.username)) {
            console.warn(`Error al añadir admin: El usuario '${data.username}' ya existe en la sección Admins.`);
            return false; 
        }

        // Añadir el nuevo administrador 
        // Guardamos la contraseña dentro de un array, como en el formato original
        allCredentials.Admins[data.username] = [data.password];
        console.log(`Admin '${data.username}' preparado para ser añadido.`);

        // Escribir en el archivo 
        try {
            const jsonData = JSON.stringify(allCredentials, null, 2); // Formatear JSON
            await fs.writeFile(CREDENTIALS_FILE_PATH, jsonData, 'utf-8');
            console.log(`Admin '${data.username}' añadido exitosamente a ${path.basename(CREDENTIALS_FILE_PATH)}.`);
            return true; // Éxito

        } catch (writeError) {
            console.error(`Error fatal al escribir en el archivo de credenciales: ${writeError.message}`);
            return false; // Fallo al escribir
        }

    } catch (error) {
        // Capturar errores de parseo JSON u otros inesperados
        if (error instanceof SyntaxError) {
            console.error(`Error Crítico: El archivo ${path.basename(CREDENTIALS_FILE_PATH)} contiene JSON inválido y no se pudo procesar. ${error.message}`);
        } else {
            console.error(`Error inesperado durante el proceso de añadir admin: ${error.message}`);
        }
        return false; 
    }
}

//Chequear si alguien es admin
async function checkAdminCredentials(data) {
    console.log(`Verificando credenciales para usuario: ${data.username}`);

    // Validación básica de entrada
    if (!data.username || data.password === undefined || data.password === null) {
        console.warn("Intento de verificación con username o password faltantes.");
        return { error: "Faltan datos" }; // No se puede verificar sin ambos datos
    }

    try {
        let fileContent;
        // Intentar leer el archivo
        try {
            fileContent = await fs.readFile(credentials, 'utf-8');
        } catch (readError) {
            if (readError.code === 'ENOENT') {
                console.error(`Error Crítico: El archivo de credenciales no se encontró en ${CREDENTIALS_FILE_PATH}. No se puede autenticar.`);
            } else {
                console.error(`Error al leer el archivo de credenciales: ${readError.message}`);
            }
            return { error: "fallo de archivo" }; // No se pueden verificar credenciales si el archivo falla
        }

        // Comprobar si el archivo está vacío
         if (fileContent.trim() === '') {
            console.warn(`El archivo de credenciales ${path.basename(CREDENTIALS_FILE_PATH)} está vacío.`);
            return { error: "No exiisten admins" }; // No hay credenciales que verificar
        }

        // Intentar parsear el JSON
        const allCredentials = JSON.parse(fileContent);

        //  Lógica de Verificación 
        
        if (!allCredentials || typeof allCredentials !== 'object' || !allCredentials.hasOwnProperty('Admins') || typeof allCredentials.Admins !== 'object' || allCredentials.Admins === null) {
            console.error(`Error: El archivo de credenciales ${path.basename(CREDENTIALS_FILE_PATH)} no tiene la clave 'Admins' o esta no es un objeto válido.`);
            return { error: "Error Interno base de datos." }; // Estructura incorrecta
        }
         // Obtener el objeto específico de credenciales de administrador
         const adminCredentials = allCredentials.Admins;

         if (adminCredentials.hasOwnProperty(data.username)) {
            const storedPasswordArray = adminCredentials[data.username];
            //  Verificar si el valor asociado es realmente un array
            if (Array.isArray(storedPasswordArray)) {

                // Verificar si la contraseña proporcionada está incluida en el array
                if (storedPasswordArray.includes(data.password)) {
                    console.log(`Credenciales de ADMIN válidas para el usuario: ${data.username}.`);
                    return 1; // Credenciales correctas
                } else {
                    // Contraseña incorrecta para un admin existente
                    console.log(`Contraseña de ADMIN incorrecta para el usuario: ${data.username}.`);
                    return { error: "Contraseña incorrecta"};
                }
            } else {
                // El formato es incorrecto para este admin (no es un array)
                console.warn(`Formato inválido en ${path.basename(CREDENTIALS_FILE_PATH)} para el ADMIN '${data.username}'. Se esperaba un array de contraseñas.`);
                return { error: "Error Interno base de datos" };
            }
        } else {
            // El nombre de usuario admin no existe en la sección "Admins"
            console.log(`Usuario ADMIN '${data.username}' no encontrado en la sección 'Admins'.`);
            return 0;
        }

    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error(`Error Crítico: El archivo de credenciales ${path.basename(CREDENTIALS_FILE_PATH)} contiene JSON inválido. ${error.message}`);
        } else {
            // Captura cualquier otro error inesperado
            console.error(`Error inesperado durante la verificación de credenciales de admin: ${error.message}`);
        }
        return -1; // Devuelve 0 en caso de cualquier error
    }
}

// Exportar la función para que pueda ser usada en otros archivos
module.exports = {
    checkAdminCredentials,
    addAdminCredential
};