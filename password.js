const bcrypt = require('bcrypt');
const saltRounds = 10;
const fs = require('fs');

const user = {
    username: 'admin',
    password: 'adminadmin',
};

// Hacher le mot de passe
bcrypt.hash(user.password, saltRounds, (err, passwordHash) => {
    if (err) {
        console.error('Erreur de hachage du mot de passe :', err);
    } else {
        // Lire le fichier JSON existant ou créer un nouveau s'il n'existe pas
        let storedHashes = {};

        try {
            const data = fs.readFileSync('hashes.json');
            storedHashes = JSON.parse(data);
        } catch (err) {
            // Le fichier n'existe pas encore, ou il y a une erreur de lecture
            // Vous pouvez gérer cela en fonction de vos besoins
        }

        // Stocker 'passwordHash' dans un objet
        const hashes = {
            passwordHash,
            username: user.username, // Stocker le nom d'utilisateur en clair
        };

        // Fusionner les hachages existants avec les nouveaux
        const mergedHashes = { ...storedHashes, ...hashes };

        // Stocker les hachages fusionnés dans le fichier JSON
        fs.writeFileSync('hashes.json', JSON.stringify(mergedHashes));

        console.log('Mot de passe haché :', passwordHash);
    }
});
