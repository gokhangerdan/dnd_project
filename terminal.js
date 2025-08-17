/**
 * Terminal Module - Manages terminal output and logging
 */

class TerminalManager {
    constructor() {
        this.terminalContent = document.getElementById('terminalContent');
        this.clearButton = document.getElementById('clearTerminal');
        this.init();
    }

    init() {
        this.clearButton.addEventListener('click', () => this.clear());
        this.log('Terminal initialized', 'info');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.className = `terminal-line terminal-${type}`;
        
        line.innerHTML = `<span class="terminal-timestamp">[${timestamp}]</span>${message}`;
        
        this.terminalContent.appendChild(line);
        this.scrollToBottom();
    }

    info(message) {
        this.log(message, 'info');
    }

    success(message) {
        this.log(message, 'success');
    }

    warning(message) {
        this.log(message, 'warning');
    }

    error(message) {
        this.log(message, 'error');
    }

    clear() {
        this.terminalContent.innerHTML = '';
        this.log('Terminal cleared', 'info');
    }

    scrollToBottom() {
        this.terminalContent.scrollTop = this.terminalContent.scrollHeight;
    }
}

// Initialize terminal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.terminalManager = new TerminalManager();
});
