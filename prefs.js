const Gtk = imports.gi.Gtk;
const ExtensionUtils = imports.misc.extensionUtils;

// On essaie de charger Adw (LibAdwaita), sinon on fera sans
let Adw = null;
try {
    Adw = imports.gi.Adw;
} catch (e) {
    Adw = null;
}

function init() {
}

function buildPrefsWidget() {
    let settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.messenger42');

    // Si LibAdwaita est disponible (GNOME récent)
    if (Adw) {
        let page = new Adw.PreferencesPage();
        let group = new Adw.PreferencesGroup({
            title: 'Paramètres de connexion',
            description: 'Configurez vos identifiants pour le messenger 42'
        });
        page.add(group);

        // Champ Login
        let loginRow = new Adw.EntryRow({ title: 'Login' });
        loginRow.set_text(settings.get_string('login'));
        loginRow.connect('changed', (widget) => {
            settings.set_string('login', widget.get_text());
        });
        group.add(loginRow);

        // Champ Mot de passe
        let passwordRow = new Adw.PasswordEntryRow({ title: 'Mot de passe' });
        passwordRow.set_text(settings.get_string('password'));
        passwordRow.connect('changed', (widget) => {
            settings.set_string('password', widget.get_text());
        });
        group.add(passwordRow);

        // Info label
        let infoGroup = new Adw.PreferencesGroup();
        // Utiliser Gtk.Label standard pour éviter les erreurs de version
        let infoLabel = new Gtk.Label({
            label: '⚠️ Après modification, redémarrez l\'extension (ou GNOME) pour appliquer.',
            wrap: true,
            xalign: 0,
            margin_top: 12, margin_bottom: 12, margin_start: 12, margin_end: 12
        });
        // Essayer d'ajouter la classe CSS si possible, sinon ignorer
        try { infoLabel.get_style_context().add_class('dim-label'); } catch(e) {}
        
        // Adw.PreferencesGroup attend un widget qui a des propriétés spécifiques, 
        // on l'enveloppe dans une Adw.ActionRow pour être propre si nécessaire, 
        // ou on l'ajoute directement si c'est un PreferencesGroup générique.
        // Pour être sûr avec Adw 1.x :
        let infoRow = new Adw.ActionRow();
        infoRow.set_child(infoLabel);
        infoGroup.add(infoRow);
        
        page.add(infoGroup);

        return page;
    } 
    
    // FALLBACK : Interface GTK classique (si Adw n'est pas là ou pose problème)
    else {
        let widget = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 20, margin_bottom: 20, margin_start: 20, margin_end: 20,
            spacing: 20
        });

        let loginBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10 });
        loginBox.append(new Gtk.Label({ label: "Login", xalign: 0 }));
        let loginEntry = new Gtk.Entry({ text: settings.get_string('login') });
        loginEntry.connect('changed', (w) => settings.set_string('login', w.get_text()));
        loginBox.append(loginEntry);
        widget.append(loginBox);

        let passBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10 });
        passBox.append(new Gtk.Label({ label: "Mot de passe", xalign: 0 }));
        let passEntry = new Gtk.Entry({ text: settings.get_string('password'), visibility: false });
        passEntry.connect('changed', (w) => settings.set_string('password', w.get_text()));
        passBox.append(passEntry);
        widget.append(passBox);

        widget.append(new Gtk.Label({ label: "⚠️ Redémarrez l'extension après modification." }));

        return widget;
    }
}