/**
 * Drawer Module - Manages the left sidebar with draggable node types
 */

class DrawerManager {
    constructor() {
        this.init();
    }

    init() {
        this.renderDrawer();
        this.attachEventListeners();
    }

    renderDrawer() {
        const drawer = document.getElementById('drawer');
        drawer.innerHTML = `
            <h3>Node Library</h3>
            <div class="node" draggable="true" data-type="start">
                Start Node
            </div>
            <div class="node" draggable="true" data-type="node1">
                API Call Node
            </div>
            <div class="node" draggable="true" data-type="end">
                End Node
            </div>
        `;
    }

    attachEventListeners() {
        const drawerNodes = document.querySelectorAll('#drawer .node');
        
        drawerNodes.forEach(node => {
            node.addEventListener('dragstart', this.handleDragStart.bind(this));
            node.addEventListener('dragend', this.handleDragEnd.bind(this));
            
            // Add click event to show node information
            node.addEventListener('click', (e) => {
                const nodeType = e.target.getAttribute('data-type');
                this.showNodeInfo(nodeType);
            });
        });
    }

    handleDragStart(event) {
        const nodeType = event.target.getAttribute('data-type');
        window.draggedNodeType = nodeType;
        
        event.target.style.opacity = '0.5';
        event.dataTransfer.effectAllowed = 'copy';
    }

    handleDragEnd(event) {
        event.target.style.opacity = '1';
        window.draggedNodeType = null;
    }

    showNodeInfo(nodeType) {
        const nodeInfo = this.getNodeInfo(nodeType);
        
        if (window.workflowManager) {
            window.workflowManager.showDrawerNodeInfo(nodeInfo);
        }
    }

    getNodeInfo(type) {
        const nodeInfos = {
            start: {
                name: 'Start Node',
                description: 'This node marks the beginning of the workflow execution. Every workflow must have at least one start node.',
                inputs: 'None',
                outputs: 'One output connector to connect to the next node',
                properties: 'Name (customizable)',
                usage: 'Drag this node to the workspace to begin creating your workflow'
            },
            node1: {
                name: 'API Call Node',
                description: 'Makes HTTP API calls with full configuration options including method, headers, body, and timeout.',
                inputs: 'One input connector from previous node',
                outputs: 'One output connector to connect to next node',
                properties: 'Name, API URL, HTTP Method, Headers, Request Body, Timeout',
                usage: 'Configure the API endpoint and parameters in the properties panel, then use in your workflow'
            },
            end: {
                name: 'End Node',
                description: 'This node marks the end of the workflow execution. It completes the workflow when reached.',
                inputs: 'One input connector from previous node',
                outputs: 'None',
                properties: 'Name (customizable)',
                usage: 'Drag this node to mark the completion point of your workflow'
            }
        };
        
        return nodeInfos[type] || nodeInfos.node1;
    }
}

// Initialize drawer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DrawerManager();
});
