const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors'); // Nuevo

const app = express();
const PORT = 3000;

// Middleware para manejar CORS
app.use(cors());

// Middleware para manejar o parsear JSON
app.use(express.json());

// Servir archivos estáticos desde la carpeta Pagina
app.use(express.static(path.join(__dirname)));

// Ruta para servir el index.html al acceder a la raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Conexión a la base de datos MongoDB
mongoose.connect('mongodb://localhost:27017/loginSystem', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error al conectar a MongoDB', err));

// Esquema del usuario
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
});

const User = mongoose.model('User', userSchema);

// Ruta de registro de usuario
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    console.log(`Registro solicitado: ${username}, ${password}, ${role}`);
    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ username });
    if (userExists) {
        return res.status(400).json({ message: 'El nombre de usuario ya existe' });
    }

    // Cifrar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el nuevo usuario
    try {
        const user = new User({ username, password: hashedPassword, role });
        await user.save();
        res.status(201).json({ message: 'Usuario registrado exitosamente!' });
    } catch (error) {
        res.status(400).json({ message: 'Error al registrar el usuario: ' + error.message });
    }
});

// Ruta de login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Buscar el usuario en la base de datos
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }

    // Generar token JWT
    const token = jwt.sign({ id: user._id, role: user.role }, 'secretKey', { expiresIn: '1h' });

    res.json({ token, message: 'Login exitoso', role: user.role });
});

// Middleware para la autenticación JWT
function authMiddleware(req, res, next) {
    const token = req.header('Authorization').split(" ")[1];
    if (!token) return res.status(401).json({ message: 'Acceso denegado' });

    try {
        const verified = jwt.verify(token, 'secretKey');
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Token inválido' });
    }
}

// Ruta protegida
app.get('/ruta-protegida', authMiddleware, (req, res) => {
    res.json({ message: 'Accediste a una ruta protegida', user: req.user });
});

// Ruta para inicializar el administrador
app.post('/init-admin', async (req, res) => {
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10); // Contraseña por defecto
        const adminUser = new User({ username: 'admin', password: hashedPassword, role: 'admin' });
        await adminUser.save();
        res.status(201).json({ message: 'Usuario administrador creado exitosamente!' });
    } else {
        res.status(400).json({ message: 'El usuario administrador ya existe' });
    }
});

// Nueva ruta para obtener todos los usuarios
app.get('/users', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); // Excluir la contraseña
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
});

// Ruta para eliminar un usuario
app.delete('/users/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el usuario: ' + error.message });
    }
});

//Ruta para actualizar o modificar usuarios
app.put('/users/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { username, password, role } = req.body;

    try {
        // Cifrar la nueva contraseña si se envía
        let updateData = { username, role };
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

        // Actualizar el usuario en la base de datos
        const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario actualizado exitosamente', user: updatedUser });
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar el usuario: ' + error.message });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
