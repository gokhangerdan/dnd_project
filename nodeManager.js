/**
 * Node Manager - Handles node creation, templating, and element management
 */

class NodeManager {
    static getNodeTemplate(type) {
        const templates = {
            start: {
                defaultName: 'Start Node',
                hasLeftConnector: false,
                hasRightConnector: true,
                color: '#4caf50'
            },
            end: {
                defaultName: 'End Node',
                hasLeftConnector: true,
                hasRightConnector: false,
                color: '#f44336'
            },
            node1: {
                defaultName: 'API Call Node',
                hasLeftConnector: true,
                hasRightConnector: true,
                color: '#2196f3'
            }
        };
        
        return templates[type] || templates.node1;
    }

    static createNodeElement(nodeData, x, y) {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'node workspace-node';
        nodeElement.style.left = `${x}px`;
        nodeElement.style.top = `${y}px`;
        nodeElement.textContent = nodeData.defaultName;

        if (nodeData.hasLeftConnector) {
            const leftConnector = NodeManager.createConnector('left');
            nodeElement.appendChild(leftConnector);
        }

        if (nodeData.hasRightConnector) {
            const rightConnector = NodeManager.createConnector('right');
            nodeElement.appendChild(rightConnector);
        }

        return nodeElement;
    }

    static createConnector(side) {
        const connector = document.createElement('div');
        connector.className = `connector ${side}`;
        connector.style[side] = '-8px';
        return connector;
    }
}
