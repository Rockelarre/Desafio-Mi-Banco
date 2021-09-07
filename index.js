// Para una nueva transaccion ingrese los argumentos en orden: 
// node index.js nueva_transaccion id_cuenta_depositante id_cuenta_receptora monto_de_deposito
//
// Para consultar las transacciones de una cuenta los argumentos en orden:
// node index.js consulta_tabla_transacciones id_cuenta_consultada
//
// Para consultar el saldo de una cuenta los argumentos en orden:
// node index.js consultar_saldo_cuenta id_cuenta_consultada

// Importar módulos necesarios
const { release } = require('os');
const { Pool } = require('pg');
const Cursor = require('pg-cursor');

// Capturando argumentos por línea de comandos
const argumentos = process.argv.slice(2);

let arg_accion = argumentos[0];
let cuenta_1 = argumentos[1];
let cuenta_2 = argumentos[2];
let monto = argumentos[3];

// Objeto con información de configuración
const config = {
    user: 'postgres',
    host: 'localhost',
    database: 'Banco',
    password: 'password',
    port: 5432,
}

// Nuevo objeto de la clase Pool()
const pool = new Pool(config);


// Opción para ingresar una nueva transacción
if ( arg_accion == 'nueva_transaccion') {

    pool.connect( async (error_conexion, client, release) => {

        if(error_conexion) {
            console.log(error_conexion);
        } else {

            try {
            
                await client.query('BEGIN');
    
                const descontar = `UPDATE cuentas SET saldo = saldo - ${monto} WHERE id = ${cuenta_1} RETURNING *;`;
                const descuento = await client.query(descontar);
    
                const acreditar = `UPDATE cuentas SET saldo = saldo + ${monto} WHERE id = ${cuenta_2} RETURNING *;`;
                const acreditacion = await client.query(acreditar);
    
                const date = new Date();
                const transar = `INSERT INTO transacciones (descripcion,fecha,monto,cuenta)
                                        VALUES ('Transacción','${date.toLocaleDateString()}',${monto},${cuenta_1}) RETURNING *;`;
                const transaccion = await client.query(transar);
    
                console.log("Descuento realizado con éxito: ", descuento.rows[0]);
                console.log("Acreditación realizada con éxito: ", acreditacion.rows[0]);
                console.log("Transacción realizada con éxito: ", transaccion.rows[0]);
    
                await client.query('COMMIT');
    
            } catch (e) {
    
                await client.query('ROLLBACK');
    
                console.log("Error código: " + e.code);
                console.log("Detalle del error: " + e.detail);
                console.log("Tabla originaria del error: " + e.table);
                console.log("Restricción violada en el campo: " + e.constraint);
    
            }
    
            release();
            pool.end();
        }
        
    })
}


// Opción para consultar tabla transacciones
if ( arg_accion == 'consulta_tabla_transacciones') {

    pool.connect((error_conexion,client,release) => {

        if(error_conexion) {
            console.log(error_conexion);
        } else {

            const consulta = new Cursor(`SELECT * FROM transacciones WHERE cuenta = ${cuenta_1}`);
            const cursor = client.query(consulta);

            cursor.read(10, (err,rows) => {
                console.log(rows);

                cursor.close();
                release();
                pool.end();
            })
        }
    })
}

// Opción para consultar el saldo de una cuenta
if ( arg_accion == 'consultar_saldo_cuenta') {

    pool.connect((error_conexion,client,release) => {
        
        if (error_conexion) {
            console.log(error_conexion);

        } else {

            const consulta = new Cursor(`SELECT * FROM cuentas WHERE id = ${cuenta_1}`);
            const cursor = client.query(consulta);

            cursor.read(1, (err,rows) => {
            console.log(`El saldo de la cuenta ${rows[0].id} es: ${rows[0].saldo}`);

            cursor.close();
            release();
            pool.end();
            })
        }
    })
}