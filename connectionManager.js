/**
 * Connection Manager - Handles connection visualization and management
 */

class ConnectionManager {
    constructor(workflowManager) {
        this.workflowManager = workflowManager;
        this.connectionsSvg = workflowManager.connectionsSvg;
    }

    setupSVG() {
        this.connectionsSvg.setAttribute('width', '100%');
        this.connectionsSvg.setAttribute('height', '100%');
        this.connectionsSvg.removeAttribute('viewBox');
    }

    startTempLine(connector) {
        this.removeTempLine();
        this.workflowManager.tempLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        this.workflowManager.tempLine.setAttribute("stroke", "#ff9800");
        this.workflowManager.tempLine.setAttribute("stroke-width", "2");
        this.workflowManager.tempLine.setAttribute("stroke-dasharray", "5,5");
        this.connectionsSvg.appendChild(this.workflowManager.tempLine);
    }

    updateTempLine(event) {
        if (!this.workflowManager.tempLine || !this.workflowManager.connectingFrom) return;
        
        const wsRect = this.workflowManager.workspace.getBoundingClientRect();
        const fromNode = this.workflowManager.connectingFrom.node;
        
        let fromX, fromY;
        if (this.workflowManager.connectingFrom.connector.classList.contains('right')) {
            fromX = fromNode.x + 120;
            fromY = fromNode.y + 20;
        } else {
            fromX = fromNode.x - 8;
            fromY = fromNode.y + 20;
        }
        
        const x2 = event.clientX - wsRect.left;
        const y2 = event.clientY - wsRect.top;
        
        this.workflowManager.tempLine.setAttribute("x1", fromX);
        this.workflowManager.tempLine.setAttribute("y1", fromY);
        this.workflowManager.tempLine.setAttribute("x2", x2);
        this.workflowManager.tempLine.setAttribute("y2", y2);
    }

    removeTempLine() {
        if (this.workflowManager.tempLine && this.workflowManager.tempLine.parentNode) {
            this.workflowManager.tempLine.parentNode.removeChild(this.workflowManager.tempLine);
        }
        this.workflowManager.tempLine = null;
    }

    renderConnections() {
        const existingLines = this.connectionsSvg.querySelectorAll('line:not([stroke-dasharray])');
        existingLines.forEach(line => line.remove());
        
        this.workflowManager.connections.forEach((connection, index) => {
            const line = this.createConnectionLine(connection);
            this.connectionsSvg.appendChild(line);
        });
    }

    createConnectionLine(connection) {
        const fromNode = connection.from;
        const toNode = connection.to;
        
        const fromX = fromNode.x + 120;
        const fromY = fromNode.y + 20;
        const toX = toNode.x - 8;
        const toY = toNode.y + 20;
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", fromX);
        line.setAttribute("y1", fromY);
        line.setAttribute("x2", toX);
        line.setAttribute("y2", toY);
        line.setAttribute("stroke", "#1976d2");
        line.setAttribute("stroke-width", "3");
        line.setAttribute("opacity", "1");
        line.setAttribute("visibility", "visible");
        
        return line;
    }
}
