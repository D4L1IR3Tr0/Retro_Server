const bodyParser = require('body-parser');
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcrypt');
const https = require('https');
const crypto = require('crypto');
var figlet = require("figlet");

figlet("RETRO",{font: "Bloody"}, function (err, data) {
  if (err) {
    console.log("Something went wrong...");
    console.dir(err);
    return;
  }
  console.log(data);
});





const app = express();

const httpsOptions = {
    key: fs.readFileSync('private-key.pem'),
    cert: fs.readFileSync('certificate.pem'),
};

const httpsServer = https.createServer(httpsOptions, app);


// Use the bodyParser middleware to parse JSON data
app.use(bodyParser.json());

const port = 2459;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip;

    try {
        // Lire les hachages depuis le fichier JSON
        const data = fs.readFileSync('hashes.json');
        const storedHashes = JSON.parse(data);

        // Récupérez le hachage du mot de passe associé à l'utilisateur depuis les hachages stockés
        const hashedPasswordFromDatabase = storedHashes.passwordHash;
        const usernameFromDatabase = storedHashes.username;

        // Comparez le mot de passe entré par l'utilisateur avec le hachage du mot de passe de la base de données
        bcrypt.compare(password, hashedPasswordFromDatabase, (err, passwordResult) => {
            if (err) {
                console.error('Erreur lors de la comparaison des mots de passe :', err);
                res.status(500).json({ message: 'Erreur de serveur' });
            } else if (passwordResult) {

                if (username === usernameFromDatabase) {
                    res.status(200).json({ message: 'Connexion réussie' });
                    console.log('Connexion réussie ==> ' + ip);
                } else {
                    res.status(401).json({ message: 'Échec de la connexion' });
                    console.log('Connexion refusée [err Username] ==> ' + ip);
                    console.log(password + "\n" +  username);
                }
            } else {
                res.status(401).json({ message: 'Échec de la connexion' });
                console.log('Connexion refusée [err Password] ==> ' + ip);
                console.log("Login fourni : " + username + "\n" + "Mot depasse fourni : "+password);
            }
        });
    } catch (err) {
        console.error('Erreur lors de la lecture des hachages :', err);
        res.status(500).json({ message: 'Erreur de serveur' });
    }
});

function generateRandomString(length) {
    return crypto.randomBytes(length).toString('hex');
}

app.get('/page_succes', (req, res) => {
    const randomURL = generateRandomString(8); // Generate an 8-character random string
    res.redirect(307, `/${randomURL}`);
});

app.get('/:randomURL', (req, res) => {
    const requestedRandomURL = req.params.randomURL;
    if (requestedRandomURL.length === 16) {
        // Check if the requested randomURL has the expected length
        res.sendFile(path.join(__dirname, 'public', 'server.html'));
    } else {
        res.status(404).send('Not Found');
    }
});


// Définir le dossier où seront stockés les uploaded_files uploadés
const uploadFolder = "uploaded_files";


// Créer une instance de multer avec la configuration du dossier de destination et du nom du fichier
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadFolder);
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        },
    }),
});

// Servir les uploaded_files statiques du dossier public
app.use(express.static(path.join(__dirname, 'public')));


// Middleware to check if a file or directory is within the uploadFolder
function isPathInUploadFolder(req, res, next) {
    // Get the requested path from the URL
    const requestedPath = req.params.requestedPath;

    // Calculate the full path by joining it with the uploadFolder
    const fullPath = path.join(uploadFolder, requestedPath);

    // Check if the calculated full path starts with the uploadFolder path
    if (fullPath.startsWith(path.resolve(uploadFolder))) {
        // The path is within the uploadFolder, so it's allowed
        next();
    } else {
        // The path is outside the uploadFolder, so it's not allowed
        res.status(403).json({
            message: "Access to this path is not allowed.",
        });
    }
}

// Route to get the contents of a directory within the uploadFolder
app.get("/files/:requestedPath", isPathInUploadFolder, (req, res) => {
    // Get the requested path from the URL
    const requestedPath = req.params.requestedPath;

    // Calculate the full path by joining it with the uploadFolder
    const fullPath = path.join(uploadFolder, requestedPath);

    // Check if the path is a directory or a file
    if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) {
            // The requested path is a directory, you can list its contents here
            const directoryContents = fs.readdirSync(fullPath);
            res.json({
                contents: directoryContents,
            });
        } else {
            // The requested path is a file, you can handle file downloads here
            // Implement file download logic as needed
        }
    } else {
        // The requested path does not exist
        res.status(404).json({
            message: "Path not found.",
        });
    }
});


app.get('/', (req, res) => {
    console.log('GET request received for /');
    res.sendFile(path.join(__dirname, 'server.html'));
});

// Créer une route POST pour gérer l'upload des uploaded_files
app.post("/upload", upload.array("files"), (req, res) => {
    // Renvoyer un message de succès avec la liste des uploaded_files uploadés
    res.json({
        message: "Fichiers uploadés avec succès",
        files: req.files.map((file) => file.originalname),
    });
    // Ajouter un console.log pour vérifier les uploaded_files uploadés
    console.log("Fichiers uploadés:", req.files);
});

// Créer une route GET pour obtenir la liste des uploaded_files déjà uploadés
app.get("/getFiles", (req, res) => {
    // Utilisez le module fs pour lire le contenu du dossier d'upload
    fs.readdir(uploadFolder, (err, files) => {
        if (err) {
            // En cas d'erreur, renvoyer une réponse d'erreur
            res.status(500).json({
                message: "Erreur lors de la récupération des uploaded_files",
                error: err,
            });
        } else {
            // En cas de succès, renvoyer la liste des uploaded_files
            res.json(files);
        }
    });
});


// Créer une route GET pour gérer le téléchargement des uploaded_files
app.get("/download/:fileName", (req, res) => {
    // Récupérer le nom du fichier à télécharger depuis les paramètres de la requête
    const fileName = req.params.fileName;

    // Construire le chemin du fichier à télécharger
    const filePath = path.join(uploadFolder, fileName);

    // Vérifier si le fichier existe
    if (fs.existsSync(filePath)) {
        // Envoyer le fichier en tant que pièce jointe avec le même nom
        res.download(filePath, fileName);
        // Ajouter un console.log pour vérifier le téléchargement du fichier
        console.log("Fichier téléchargé:", fileName);
    } else {
        // Renvoyer un message d'erreur si le fichier n'existe pas
        res.status(404).json({
            message: "Fichier introuvable",
        });
        // Ajouter un console.log pour vérifier l'erreur du téléchargement du fichier
        console.log("Erreur de téléchargement:", fileName);
    }
});

// Créer une route GET pour afficher le contenu du fichier
app.get("/show/:fileName", (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(uploadFolder, fileName);

    if (fs.existsSync(filePath)) {
        // Lire le contenu du fichier en tant que flux binaire
        const fileContent = fs.readFileSync(filePath);

        // Déterminer le type de contenu en fonction de l'extension du fichier
        const fileExtension = path.extname(fileName).toLowerCase();
        let contentType = "";

        switch (fileExtension) {
            case ".pdf":
                contentType = "application/pdf";
                break;
            case ".jpg":
            case ".jpeg":
                contentType = "image/jpeg";
                break;
            case ".png":
                contentType = "image/png";
                break;
            // Ajoutez d'autres extensions et types de contenu au besoin
            default:
                contentType = "application/octet-stream"; // Type de contenu générique
                break;
        }

        // Envoyer le contenu avec le type de contenu approprié
        res.setHeader("Content-Type", contentType);
        res.send(fileContent);
    } else {
        res.status(404).json({
            message: "Fichier introuvable",
        });
    }
});



// Créer une route DELETE pour gérer la suppression des uploaded_files
app.delete("/delete/:fileName", (req, res) => {
    // Récupérer le nom du fichier à supprimer depuis les paramètres de la requête
    const fileName = req.params.fileName;

    // Construire le chemin du fichier à supprimer
    const filePath = path.join(uploadFolder, fileName);

    // Vérifier si le fichier existe
    if (fs.existsSync(filePath)) {
        // Supprimer le fichier du dossier
        fs.unlink(filePath, (err) => {
            if (err) {
                // Renvoyer un message d'erreur en cas de problème lors de la suppression
                res.status(500).json({
                    message: "Erreur lors de la suppression du fichier",
                    error: err,
                });
                // Ajouter un console.log pour vérifier l'erreur de suppression du fichier
                console.log("Erreur de suppression:", fileName, err);
            } else {
                // Renvoyer un message de succès après la suppression
                res.json({
                    message: "Fichier supprimé avec succès",
                });
                // Ajouter un console.log pour vérifier la suppression du fichier
                console.log("Fichier supprimé:", fileName);
            }
        });
    } else {
        // Renvoyer un message d'erreur si le fichier n'existe pas
        res.status(404).json({
            message: "Fichier introuvable",
        });
        // Ajouter un console.log pour vérifier l'erreur de suppression du fichier
        console.log("Erreur de suppression:", fileName);
    }
});


// Route to navigate back in the path history
app.get("/goback", (req, res) => {
    // Pop the last path from the history array
    const lastPath = pathHistory.pop();

    if (lastPath) {
        // Redirect to the last visited path
        res.redirect(`/files/${lastPath}`);
    } else {
        // If there is no history, redirect to the root path
        res.redirect("/files/");
    }
});

// Create a route to get the current path
app.get("/currentPath", (req, res) => {
    // Set the current path to the location of the "uploaded_files" folder
    const currentPath = path.join(__dirname, uploadFolder);

    // Send the current path as a response
    res.json({
        currentPath: "-/", // Set the current path to "root" for security
    });
});


httpsServer.listen(port, () => {
    console.log(`Serveur HTTPS écoutant sur le port ${port}`);
});