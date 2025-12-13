# 42 Messenger Ultimate - Extension GNOME Shell

Extension GNOME Shell pour afficher des messages, images, GIFs et vidéos YouTube en plein écran.

## 🚀 Installation Rapide

```bash
cd /home/.gemini/antigravity/scratch/messenger_fix
./install.sh
```

L'extension sera automatiquement installée et activée !

## ✨ Fonctionnalités

### 📝 Messages Texte
- Affichage en plein écran avec fond semi-transparent
- Couleur et taille personnalisables
- Fermeture automatique après la durée spécifiée
- Fermeture manuelle avec **F2** ou **Escape**

### 🖼️ Images
- Support des formats JPEG, PNG
- **Support des GIFs animés**
- Redimensionnement automatique avec préservation du ratio
- Bordures fines (1px) et coins arrondis
- Couleur de bordure personnalisable

### 🎬 Vidéos YouTube
- Détection automatique des liens YouTube
- Ouverture en mode kiosque (plein écran sans interface)
- Autoplay activé
- Fermeture automatique après le timer
- Formats supportés : `youtube.com/watch?v=...` et `youtu.be/...`

## 🔧 Configuration

### Modifier les identifiants de connexion

1. Ouvrir **Extensions** (ou `gnome-extensions-app`)
2. Trouver **42 Messenger Ultimate**
3. Cliquer sur l'icône ⚙️ (paramètres)
4. Modifier le login et le mot de passe
5. Désactiver puis réactiver l'extension pour appliquer

### Paramètres par défaut
- **Login** : `test`
- **Mot de passe** : `test`
- **Polling** : toutes les 5 secondes

## 📋 Structure des fichiers

```
messenger.projet42.fr/
├── extension.js              # Code principal
├── metadata.json             # Métadonnées de l'extension
├── stylesheet.css            # Styles (vide)
├── prefs.js                  # Interface de préférences
├── schemas/
│   ├── org.gnome.shell.extensions.messenger42.gschema.xml
│   └── gschemas.compiled
├── install.sh                # Script d'installation
└── README.md                 # Ce fichier
```

## 🔑 Raccourcis clavier

- **F2** : Fermer le message/popup actuel
- **Escape** : Fermer le message/popup actuel

## 🐛 Dépannage

### L'extension ne se charge pas

Vérifier les logs :
```bash
journalctl -f -o cat | grep -i messenger
```

### Recharger GNOME Shell

**Sous X11** :
```bash
Alt+F2 → tapez 'r' → Entrée
```

**Sous Wayland** :
Déconnexion/Reconnexion

### Réinstaller l'extension

```bash
cd /home/.gemini/antigravity/scratch/messenger_fix
./install.sh
```

## 📡 API

L'extension communique avec : `http://42.pacomepilaz.com/api.php`

### Format des messages

**Message texte** :
```json
{
  "type": "text",
  "message": "Votre message",
  "duration": 10,
  "color": "#ffffff",
  "size": 40
}
```

**Image** :
```json
{
  "type": "image",
  "message": "BASE64_ENCODED_IMAGE",
  "duration": 10,
  "color": "#00ff00",
  "height": 400
}
```

**Vidéo YouTube** :
```json
{
  "type": "text",
  "message": "https://www.youtube.com/watch?v=VIDEO_ID",
  "duration": 30
}
```

**Commande** :
```json
{
  "type": "text",
  "message": "cmd:notify-send 'Test'"
}
```

## 📝 Versions GNOME Shell supportées

- GNOME Shell 3.36+
- GNOME Shell 40+
- GNOME Shell 41, 42, 43, 44, 45, **46**

## 📄 Licence

Ce projet est fourni tel quel, sans garantie.

## 👨‍💻 Développement

Pour modifier l'extension :

1. Éditer les fichiers dans `/home/.gemini/antigravity/scratch/messenger_fix/`
2. Lancer `./install.sh` pour réinstaller
3. Recharger GNOME Shell (si nécessaire)

