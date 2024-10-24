const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./user');  // Importar el modelo de usuario
const app = express();
const path = require('path');
const port = 4000;
const cors = require('cors');
app.use(cors());


// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// Ruta para la página principal (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

    // Conectar a la base de datos MongoDB (Asegúrate de que MongoDB esté corriendo)
mongoose.connect('mongodb://127.0.0.1:27018/Cafe', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("Conectado a la base de datos MongoDB");
})
.catch(err => console.error("Error al conectar a la base de datos", err));

// Middleware para procesar JSON
app.use(express.json());

// === Definir el modelo de incidencia directamente aquí ===
const incidenciaSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ubicacion: { type: String, required: true },
    tipo: { type: String, required: true },
    descripcion: { type: String, required: true },
    impacto: { type: String, required: true },
    estado: { type: String, default: 'Pendiente' },
    fechaCreacion: { type: Date, default: Date.now }
});

const Incidencia = mongoose.model('Incidencia', incidenciaSchema);

// === Ruta para obtener todas las incidencias ===
app.get('/incidencias', async (req, res) => {
    try {
        // Obtener todas las incidencias de la base de datos
        const incidencias = await Incidencia.find();
        res.status(200).json(incidencias);
    } catch (err) {
        res.status(500).send('Error al obtener las incidencias');
    }
});

// Ruta para registrar un nuevo usuario
app.post('/registro', async (req, res) => {
    const { username, password, rol } = req.body;

    // Verificar si el usuario ya existe
    const usuarioExistente = await User.findOne({ username });
    if (usuarioExistente) return res.status(400).send('El usuario ya existe');

    // Crear un nuevo usuario y guardarlo en la base de datos
    const nuevoUsuario = new User({ username, password: await bcrypt.hash(password, 10), rol });
    await nuevoUsuario.save();
    res.status(201).send('Usuario registrado con éxito');
});

// Ruta para iniciar sesión
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Buscar el usuario en la base de datos
    const usuario = await User.findOne({ username });
    if (!usuario) return res.status(400).send('Usuario no encontrado');

    // Verificar la contraseña
    const esValida = await bcrypt.compare(password, usuario.password);
    if (!esValida) return res.status(400).send('Contraseña incorrecta');

    // Enviar el rol del usuario junto con el mensaje de éxito
    res.status(200).json({ message: 'Inicio de sesión exitoso', rol: usuario.rol });
});

// === Ruta para crear una nueva incidencia en el servidor===
app.post('/incidencias', async (req, res) => {
    const { tipo, descripcion, estado } = req.body;

    const nuevaIncidencia = new Incidencia({ tipo, descripcion, estado });

    try {
        await nuevaIncidencia.save();
        res.status(201).send('Incidencia creada con éxito');
    } catch (err) {
        res.status(500).send('Error al crear la incidencia');
    }
});

// === NUEVAS RUTAS PARA GESTIONAR USUARIOS ===

// Ruta para obtener todos los usuarios
app.get('/usuarios', async (req, res) => {
    try {
        const usuarios = await User.find();
        res.status(200).json(usuarios);  // Devolver la lista de usuarios como JSON
    } catch (err) {
        res.status(500).send('Error al obtener usuarios');
    }
});

// Ruta para eliminar un usuario por ID
app.delete('/usuarios/:id', async (req, res) => {
    try {
        const usuarioEliminado = await User.findByIdAndDelete(req.params.id);
        if (!usuarioEliminado) return res.status(404).send('Usuario no encontrado');
        res.status(200).send('Usuario eliminado con éxito');
    } catch (err) {
        res.status(500).send('Error al eliminar usuario');
    }
});

// Ruta para actualizar un usuario por ID
app.put('/usuarios/:id', async (req, res) => {
    const { username, rol } = req.body;
    try {
        const usuarioActualizado = await User.findByIdAndUpdate(
            req.params.id,
            { username, rol },
            { new: true }
        );
        if (!usuarioActualizado) return res.status(404).send('Usuario no encontrado');
        res.status(200).send('Usuario actualizado con éxito');
    } catch (err) {
        res.status(500).send('Error al actualizar usuario');
    }
});

//ruta para marcar como realizado las incidencias de los usuarios
app.put('/incidencias/:id', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    try {
        const incidencia = await Incidencia.findById(id);
        if (!incidencia) return res.status(404).send('Incidencia no encontrada');

        incidencia.estado = estado;  // Actualizar el estado
        await incidencia.save();

        res.status(200).send('Estado actualizado');
    } catch (error) {
        res.status(500).send('Error al actualizar el estado');
    }
});

// Ruta para obtener un usuario por ID en pagina de usuarios
app.get('/usuarios/:id', async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id);
        if (!usuario) return res.status(404).send('Usuario no encontrado');
        res.json(usuario);
    } catch (err) {
        res.status(500).send('Error al obtener el usuario');
    }
});

// Ruta para actualizar un usuario
app.put('/usuarios/:id', async (req, res) => {
    try {
        const usuarioActualizado = await Usuario.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!usuarioActualizado) return res.status(404).send('Usuario no encontrado');
        res.json(usuarioActualizado);
    } catch (err) {
        res.status(500).send('Error al actualizar el usuario');
    }
});

// Ruta para crear un nuevo reporte de incidencia del usuario y se manda al servidor
app.post('/incidencias', (req, res) => {
    const nuevaIncidencia = new Incidencia(req.body);
    nuevaIncidencia.save((err, incidencia) => {
        if (err) {
            return res.status(500).json({ message: 'Error al guardar la incidencia.' });
        }
        res.json(incidencia);  // Responder con el reporte guardado
    });
});

// Ruta para obtener todas las incidencias en el admin
app.get('/incidencias', (req, res) => {
    Incidencia.find((err, incidencias) => {
        if (err) {
            return res.status(500).json({ message: 'Error al obtener las incidencias.' });
        }
        res.json(incidencias);  // Responder con la lista de incidencias
    });
});

// Ruta para crear un usuario admin
app.post('/crear-admin', async (req, res) => {
    const { username, password } = req.body;

    // Verificar si el admin ya existe
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).send('El usuario ya existe.');
    }

    // Crear y guardar el nuevo usuario admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const nuevoAdmin = new User({
        username,
        password: hashedPassword,
        rol: 'admin'
    });

    try {
        await nuevoAdmin.save();
        res.status(201).send('Usuario admin creado con éxito.');
    } catch (err) {
        res.status(500).send('Error al crear el usuario admin.');
    }
});

// Iniciar el servidor en el puerto 3000
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

