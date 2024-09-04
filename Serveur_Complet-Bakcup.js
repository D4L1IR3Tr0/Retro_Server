/*
         __          __         __          __        __
        /\ \        /\ \       /\ \        /\ \      / /\
       /  \ \      /  \ \      \_\ \      /  \ \    / /  \
      / /\ \ \    / /\ \ \     /\__ \    / /\ \ \  / / /\ \
     / / /\ \_\  / / /\ \_\   / /_ \ \  / / /\ \_\/ / /\ \ \
    / / /_/ / / / /_/_ \/_/  / / /\ \ \/ / /_/ / /_/ /  \ \ \
   / / /__\/ / / /____/\    / / /  \/_/ / /__\/ /\ \ \   \ \ \
  / / /_____/ / /\____\/   / / /     / / /_____/  \ \ \   \ \ \
 / / /\ \ \  / / /______  / / /     / / /\ \ \     \ \ \___\ \ \
/ / /  \ \ \/ / /_______\/_/ /     / / /  \ \ \     \ \/____\ \ \
\/_/    \_\/\/__________/\_\/      \/_/    \_\/      \_________\/
retrochorizo@proton.me 

*/


const bodyParser = require('body-parser');
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcrypt');
const https = require('https');
const crypto = require('crypto');
var figlet = require("figlet");
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const SSH = require('node-ssh');
const screen = blessed.screen();




//TERMINAL////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




// Create a grid for the main content
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

const serverInfo = blessed.box({
  style: {
    
  },
  label: '',
});
screen.append(serverInfo);
// Create a box for the Figlet output
const figletBox = blessed.box({
    top: 'center',
  left: 'center',
  width: '30%', // Adjust the width as needed
  height: '90%', // Adjust the height as needed
  style: {
    fg: 'white',
  },
  label: '',
  tags: true,
  wrap: true,
  scrollable: true,
  alwaysScroll: true,
});

// Append the Figlet box to the screen
screen.append(figletBox);

// Block keyboard inputs using an event handler
screen.key(['Q', 'q', 'escape', 'C-c'], function (ch, key) {
  if (ch === 'Q' || ch === 'q') {
    // User pressed 'Q' or 'q', exit the program
    process.exit(0); // Exit with a success code (0)
  }
});

// Your Figlet message
figlet('RETRO', { font: 'Bloody' }, function (err, data) {
  if (err) {
    log.log("Something went wrong...");
    console.dir(err);
  } else {
    // Set the content of the figletBox to the Figlet output
    figletBox.setContent(data);
    screen.render();
  }
});

// Define and initialize the port variable
const port = 2459; // Replace with your actual port number

// Define your HTTPS server listening message
const listeningMessage = `\n-> Serveur HTTPS écoute sur le port \x1b[4m\x1b[31m${port}\x1b[0m\x1b[0m\n      (https://localhost:${port}) \n\n  \x1b[31m-> Press Q to quit\x1b[0m`;

// Display the server listening message in the "Server Port" box
serverInfo.setContent(listeningMessage);



// Create a log box for the main output
const log = grid.set(3, 0, 9, 12, contrib.log, {
  selectedFg: 'black',
  label: '',
  scrollable: true,
  alwaysScroll: true,
  scrollbar: { style: { bg: 'red' } },
  label: 'logs',
});



//SSH////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function startSSHServer() {
  // Implement the logic to start the SSH server using 'node-ssh' or other SSH server libraries.
  // Ensure proper security and validation in this function.
  // For a real SSH server, you would set up SSH keys and authentication.

  // In this simplified example, we just log that the SSH server is starting.
  log.log('SSH request from : ' + ip);
  return Promise.resolve();
}

async function stopSSHServer() {
  // Implement the logic to stop the SSH server using 'node-ssh' or other SSH server libraries.
  // Ensure proper security and validation in this function.

  // In this simplified example, we just log that the SSH server is stopping.
  log.log('Stopping SSH Server...');
  return Promise.resolve();
}


//CONNECTION////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const app = express();

const httpsOptions = {
    key: fs.readFileSync('private-key.pem'),
    cert: fs.readFileSync('certificate.pem'),
};

const httpsServer = https.createServer(httpsOptions, app);


// Use the bodyParser middleware to parse JSON data
app.use(bodyParser.json());


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
                    log.log('Connexion réussie ==> ' + ip);
                } else {
                    res.status(401).json({ message: 'Échec de la connexion' });
                    log.log('Connexion refusée [err Username] ==> ' + ip);
                    log.log(password + "\n" +  username);
                }
            } else {
                res.status(401).json({ message: 'Échec de la connexion' });
                log.log('Connexion refusée [err Password] ==> ' + ip);
                log.log("Login fourni : " + username + "\n" + "Mot depasse fourni : "+password);
            }
        });
    } catch (err) {
        console.error('Erreur lors de la lecture des hachages :', err);
        res.status(500).json({ message: 'Erreur de serveur' });
    }
});



//SERVEUR///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



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



app.use('/files/uploaded_files', express.static(path.join(__dirname, 'files/uploaded_files')));
// Définir le dossier où seront stockés les uploaded_files uploadés
const uploadFolder = path.join(__dirname, 'files/uploaded_files');


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
    log.log('GET request received for /');
    res.sendFile(path.join(__dirname, 'server.html'));
});

// Créer une route POST pour gérer l'upload des uploaded_files
app.post("/upload", upload.array("files"), (req, res) => {
    // Log each uploaded file's information
    req.files.forEach((file, index) => {
        log.log('File Uploaded ↩︎');
        log.log(`FileName: ${file.originalname}`);
        log.log(`Mimetype: ${file.mimetype}`);
        log.log(`Size: ${bytesToMegabytes(file.size)} MB`);
        log.log(`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);
    });
function bytesToMegabytes(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2); // Fixed to 2 decimal places
}
    // Send a success message with the list of uploaded file names
    const uploadedFileNames = req.files.map((file) => file.originalname);
    res.json({
        message: "Fichiers uploadés avec succès",
        files: uploadedFileNames,
    });
});


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
        // Ajouter un log.log pour vérifier le téléchargement du fichier
        log.log("Fichier téléchargé:"+ fileName);
    } else {
        // Renvoyer un message d'erreur si le fichier n'existe pas
        res.status(404).json({
            message: "Fichier introuvable",
        });
        // Ajouter un log.log pour vérifier l'erreur du téléchargement du fichier
        log.log("Erreur de téléchargement:"+ fileName);
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
            case ".txt":
                contentType = "text/plain";
                break;
            case ".html":
                contentType = "text/html";
                break;
            case ".doc":
                contentType = "microsoft/Doc";
                break;
            case ".pages":
                contentType = "apple/pages";
                break;
            case ".json":
                contentType = "application/json";
                break;
            case ".mp3":
                contentType = "audio/mpeg";
                break;
            case ".mp4":
                contentType = "video/mp4";
                break;
            // Add more file types as needed
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
                // Ajouter un log.log pour vérifier l'erreur de suppression du fichier
                log.log("Erreur de suppression:"+ fileName+ err);
            } else {
                // Renvoyer un message de succès après la suppression
                res.json({
                    message: "Fichier supprimé avec succès",
                });
                // Ajouter un log.log pour vérifier la suppression du fichier
                log.log("Fichier supprimé:"+ fileName);
            }
        });
    } else {
        // Renvoyer un message d'erreur si le fichier n'existe pas
        res.status(404).json({
            message: "Fichier introuvable",
        });
        // Ajouter un log.log pour vérifier l'erreur de suppression du fichier
        log.log("Erreur de suppression:"+ fileName);
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
        res.json({ currentPath });
});


httpsServer.listen(port, () => {
});

screen.render();