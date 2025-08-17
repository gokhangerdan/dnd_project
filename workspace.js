/**
 * Workspace Module - Manages the main workspace area and grid
 */

class WorkspaceManager {
    constructor() {
        this.gridSize = 50;
        this.workspace = document.getElementById('workspace');
        this.gridCanvas = document.getElementById('gridCanvas');
        this.isRunning = false;
        
        this.init();
    }

    init() {
        this.setupGrid();
        this.attachEventListeners();
        this.setupToolbarButtons();
    }

    setupGrid() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.gridCanvas.width = this.workspace.clientWidth;
        this.gridCanvas.height = this.workspace.clientHeight;
        this.drawGrid();
    }

    drawGrid() {
        const ctx = this.gridCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        
        // Grid styling
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x < this.gridCanvas.width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.gridCanvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y < this.gridCanvas.height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.gridCanvas.width, y);
            ctx.stroke();
        }
    }

    attachEventListeners() {
        this.workspace.addEventListener('dragover', this.handleDragOver.bind(this));
        this.workspace.addEventListener('drop', this.handleDrop.bind(this));
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    handleDrop(event) {
        event.preventDefault();
        
        if (!window.draggedNodeType) return;
        
        const rect = this.workspace.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        
        // Snap to grid
        x = Math.round(x / this.gridSize) * this.gridSize;
        y = Math.round(y / this.gridSize) * this.gridSize;
        
        // Create node via workflow manager
        if (window.workflowManager) {
            window.workflowManager.createWorkspaceNode(window.draggedNodeType, x, y);
        }
        
        window.draggedNodeType = null;
    }

    setupToolbarButtons() {
        document.getElementById('runBtn').addEventListener('click', this.handleRun.bind(this));
        document.getElementById('pauseBtn').addEventListener('click', this.handlePause.bind(this));
        document.getElementById('resetBtn').addEventListener('click', this.handleReset.bind(this));
    }

    handleRun() {
        if (window.workflowManager) {
            if (window.workflowManager.isPaused) {
                window.workflowManager.resumeWorkflow();
            } else if (!window.workflowManager.isExecuting) {
                window.workflowManager.executeWorkflow();
            }
        }
    }

    handlePause() {
        if (window.workflowManager && window.workflowManager.isExecuting) {
            window.workflowManager.pauseWorkflow();
        }
    }

    handleReset() {
        if (window.workflowManager) {
            window.workflowManager.resetWorkflow();
        }
        console.log('Workflow reset');
    }
}

// Initialize workspace when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.workspaceManager = new WorkspaceManager();
});
