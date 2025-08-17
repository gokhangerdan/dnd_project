/**
 * Workspace Module - Manages the main workspace area and grid
 */

class WorkspaceManager {
    constructor() {
        this.gridSize = 50;
        this.workspace = document.getElementById('workspace');
        this.gridCanvas = document.getElementById('gridCanvas');
        this.isRunning = false;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        
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
        
        const offsetX = this.panX % this.gridSize;
        const offsetY = this.panY % this.gridSize;

        // Draw vertical lines
        for (let x = offsetX; x < this.gridCanvas.width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.gridCanvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = offsetY; y < this.gridCanvas.height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.gridCanvas.width, y);
            ctx.stroke();
        }
    }

    attachEventListeners() {
        this.workspace.addEventListener('dragover', this.handleDragOver.bind(this));
        this.workspace.addEventListener('drop', this.handleDrop.bind(this));
        this.workspace.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.workspace.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.workspace.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.workspace.addEventListener('mouseleave', this.handleMouseUp.bind(this)); // Stop panning if mouse leaves
    }

    handleMouseDown(event) {
        if (window.workflowManager && window.workflowManager.isWorkspaceClick(event)) {
            this.isPanning = true;
            this.lastPanX = event.clientX;
            this.lastPanY = event.clientY;
            this.workspace.style.cursor = 'grabbing';
        }
    }

    handleMouseMove(event) {
        if (this.isPanning) {
            const dx = event.clientX - this.lastPanX;
            const dy = event.clientY - this.lastPanY;

            this.panX += dx;
            this.panY += dy;

            this.lastPanX = event.clientX;
            this.lastPanY = event.clientY;

            this.applyPan();
        }
    }

    handleMouseUp() {
        this.isPanning = false;
        this.workspace.style.cursor = 'default';
    }

    applyPan() {
        this.drawGrid();
        if (window.workflowManager) {
            window.workflowManager.applyPan(this.panX, this.panY);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    handleDrop(event) {
        event.preventDefault();
        
        if (!window.draggedNodeType) return;
        
        const rect = this.workspace.getBoundingClientRect();
        let x = event.clientX - rect.left - this.panX;
        let y = event.clientY - rect.top - this.panY;
        
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
        this.panX = 0;
        this.panY = 0;
        this.applyPan();
        console.log('Workflow reset');
    }
}

// Initialize workspace when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.workspaceManager = new WorkspaceManager();
});
