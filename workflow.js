/**
 * Workflow Module - Manages nodes, connections, and workflow logic
 */

class WorkflowManager {
    constructor() {
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.movingNode = null;
        this.connectingFrom = null;
        this.tempLine = null;
        this.offsetX = 0;
        this.offsetY = 0;
        
        this.workspace = document.getElementById('workspace');
        this.connectionsSvg = document.getElementById('connections');
        this.rightDrawer = document.getElementById('rightDrawer');
        
        this.isExecuting = false;
        this.isPaused = false;
        this.executionQueue = [];
        this.executionState = new Map();
        this.currentExecutingNode = null;
        this.pausedAt = null;
        
        this.init();
    }

    init() {
        this.attachGlobalEventListeners();
        this.setupPropertyPanel();
        this.setupSVG();
    }

    setupSVG() {
        // Remove fixed viewBox and let SVG scale naturally
        this.connectionsSvg.setAttribute('width', '100%');
        this.connectionsSvg.setAttribute('height', '100%');
        // Remove the viewBox to use actual pixel coordinates
        this.connectionsSvg.removeAttribute('viewBox');
    }

    createWorkspaceNode(type, x, y) {
        const nodeData = this.getNodeTemplate(type);
        const nodeElement = this.createNodeElement(nodeData, x, y);
        const nodeObj = {
            id: this.generateNodeId(),
            element: nodeElement,
            type: type,
            x: x,
            y: y,
            name: nodeData.defaultName,
            status: 'idle',
            // API configuration for process nodes
            apiConfig: type === 'node1' ? {
                url: '',
                method: 'GET',
                headers: '{"Content-Type": "application/json"}',
                body: '',
                timeout: 30
            } : null,
            leftConnector: nodeData.hasLeftConnector ? nodeElement.querySelector('.connector.left') : null,
            rightConnector: nodeData.hasRightConnector ? nodeElement.querySelector('.connector.right') : null
        };

        this.nodes.push(nodeObj);
        this.attachNodeEventListeners(nodeObj);
        this.workspace.appendChild(nodeElement);
        this.renderConnections();
        
        // Log node creation
        if (window.terminalManager) {
            window.terminalManager.success(`Created ${nodeData.defaultName} at (${x}, ${y})`);
        }
        
        return nodeObj;
    }

    getNodeTemplate(type) {
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

    createNodeElement(nodeData, x, y) {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'node workspace-node';
        nodeElement.style.left = `${x}px`;
        nodeElement.style.top = `${y}px`;
        nodeElement.textContent = nodeData.defaultName;

        // Add connectors based on template
        if (nodeData.hasLeftConnector) {
            const leftConnector = this.createConnector('left');
            nodeElement.appendChild(leftConnector);
        }

        if (nodeData.hasRightConnector) {
            const rightConnector = this.createConnector('right');
            nodeElement.appendChild(rightConnector);
        }

        return nodeElement;
    }

    createConnector(side) {
        const connector = document.createElement('div');
        connector.className = `connector ${side}`;
        connector.style[side] = '-8px';
        return connector;
    }

    attachNodeEventListeners(nodeObj) {
        // Node selection and movement
        nodeObj.element.addEventListener('mousedown', (event) => {
            if (event.target.classList.contains('connector')) return;
            
            this.selectNode(nodeObj);
            this.startNodeMovement(nodeObj, event);
        });

        // Connector events
        [nodeObj.leftConnector, nodeObj.rightConnector].forEach(connector => {
            if (!connector) return;
            
            connector.addEventListener('mousedown', (event) => {
                event.stopPropagation();
                this.startConnection(nodeObj, connector);
            });
        });

        nodeObj.element.addEventListener('mouseup', (event) => {
            this.handleNodeMouseUp(nodeObj, event);
        });
    }

    selectNode(nodeObj) {
        // Remove previous selection
        if (this.selectedNode) {
            this.selectedNode.element.classList.remove('selected');
        }
        
        this.selectedNode = nodeObj;
        nodeObj.element.classList.add('selected');
        this.showNodeProperties(nodeObj);
    }

    startNodeMovement(nodeObj, event) {
        this.movingNode = nodeObj;
        const rect = nodeObj.element.getBoundingClientRect();
        this.offsetX = event.clientX - rect.left;
        this.offsetY = event.clientY - rect.top;
        document.body.style.cursor = 'grabbing';
    }

    startConnection(nodeObj, connector) {
        if (this.connectingFrom && this.connectingFrom.connector !== connector) {
            this.connectingFrom.connector.classList.remove('active');
        }
        
        this.connectingFrom = { node: nodeObj, connector };
        connector.classList.add('active');
        this.startTempLine(connector);
    }

    handleNodeMouseUp(nodeObj, event) {
        if (this.connectingFrom && this.connectingFrom.node !== nodeObj) {
            this.attemptConnection(nodeObj);
        } else if (this.connectingFrom && this.connectingFrom.node === nodeObj) {
            if (!event.target.classList.contains('connector')) {
                this.cancelConnection();
            }
        }
    }

    attemptConnection(targetNode) {
        const fromNode = this.connectingFrom.node;
        const fromConnector = this.connectingFrom.connector;
        
        const isFromRight = fromConnector.classList.contains('right');
        const targetConnector = isFromRight ? targetNode.leftConnector : targetNode.rightConnector;
        
        if (targetConnector && this.isValidConnection(fromNode, targetNode)) {
            this.createConnection(fromNode, targetNode);
        }
        
        this.cancelConnection();
    }

    isValidConnection(fromNode, toNode) {
        // Prevent self-connection and duplicate connections
        if (fromNode === toNode) return false;
        
        return !this.connections.some(conn => 
            conn.from === fromNode && conn.to === toNode
        );
    }

    createConnection(fromNode, toNode) {
        this.connections.push({ from: fromNode, to: toNode });
        this.renderConnections();
        
        // Log connection creation
        if (window.terminalManager) {
            window.terminalManager.info(`Connected "${fromNode.name}" to "${toNode.name}"`);
        }
    }

    cancelConnection() {
        if (this.connectingFrom) {
            this.connectingFrom.connector.classList.remove('active');
            this.connectingFrom = null;
        }
        this.removeTempLine();
    }

    attachGlobalEventListeners() {
        document.addEventListener('mousemove', (event) => {
            if (this.movingNode) {
                this.handleNodeMovement(event);
            }
            if (this.connectingFrom) {
                this.updateTempLine(event);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.movingNode) {
                this.movingNode = null;
                document.body.style.cursor = '';
            }
        });

        this.workspace.addEventListener('mousedown', (event) => {
            if (this.isWorkspaceClick(event)) {
                this.deselectAll();
            }
        });
    }

    handleNodeMovement(event) {
        const rect = this.workspace.getBoundingClientRect();
        let x = event.clientX - rect.left - this.offsetX + this.movingNode.element.offsetWidth / 2;
        let y = event.clientY - rect.top - this.offsetY + this.movingNode.element.offsetHeight / 2;
        
        // Snap to grid
        x = Math.round(x / 50) * 50;
        y = Math.round(y / 50) * 50;
        
        this.movingNode.x = x;
        this.movingNode.y = y;
        this.movingNode.element.style.left = `${x}px`;
        this.movingNode.element.style.top = `${y}px`;
        
        // Update connections in real-time during movement
        this.renderConnections();
    }

    isWorkspaceClick(event) {
        return event.target === this.workspace || 
               event.target === document.getElementById('gridCanvas') || 
               event.target === this.connectionsSvg;
    }

    deselectAll() {
        if (this.selectedNode) {
            this.selectedNode.element.classList.remove('selected');
            this.selectedNode = null;
        }
        this.hideNodeProperties();
        this.cancelConnection();
    }

    // Property Panel Management
    setupPropertyPanel() {
        const nodeNameInput = document.getElementById('nodeName');
        const closeButton = document.getElementById('closeRightDrawer');
        const apiConfig = document.getElementById('apiConfig');
        
        // API config inputs
        const apiUrl = document.getElementById('apiUrl');
        const apiMethod = document.getElementById('apiMethod');
        const apiHeaders = document.getElementById('apiHeaders');
        const apiBody = document.getElementById('apiBody');
        const apiTimeout = document.getElementById('apiTimeout');
        
        nodeNameInput.addEventListener('input', () => {
            if (this.selectedNode) {
                this.updateNodeName(this.selectedNode, nodeNameInput.value);
            }
        });
        
        // API configuration event listeners
        [apiUrl, apiMethod, apiHeaders, apiBody, apiTimeout].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    this.updateNodeApiConfig();
                });
            }
        });
        
        closeButton.addEventListener('click', () => {
            this.hideNodeProperties();
        });
    }

    showNodeProperties(nodeObj) {
        // Always restore the properties panel first, then show properties
        this.restorePropertiesPanel();
        
        this.rightDrawer.style.display = 'block';
        document.getElementById('nodeName').value = nodeObj.name;
        document.getElementById('nodeType').value = nodeObj.type;
        
        const apiConfig = document.getElementById('apiConfig');
        
        // Show API config for process nodes
        if (nodeObj.type === 'node1' && nodeObj.apiConfig) {
            apiConfig.style.display = 'block';
            document.getElementById('apiUrl').value = nodeObj.apiConfig.url;
            document.getElementById('apiMethod').value = nodeObj.apiConfig.method;
            document.getElementById('apiHeaders').value = nodeObj.apiConfig.headers;
            document.getElementById('apiBody').value = nodeObj.apiConfig.body;
            document.getElementById('apiTimeout').value = nodeObj.apiConfig.timeout;
        } else {
            apiConfig.style.display = 'none';
        }
    }

    updateNodeApiConfig() {
        if (this.selectedNode && this.selectedNode.apiConfig) {
            this.selectedNode.apiConfig = {
                url: document.getElementById('apiUrl').value,
                method: document.getElementById('apiMethod').value,
                headers: document.getElementById('apiHeaders').value,
                body: document.getElementById('apiBody').value,
                timeout: parseInt(document.getElementById('apiTimeout').value) || 30
            };
            
            if (window.terminalManager) {
                window.terminalManager.info(`Updated API config for ${this.selectedNode.name}`);
            }
        }
    }

    // Connection Visualization
    startTempLine(connector) {
        this.removeTempLine();
        this.tempLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        this.tempLine.setAttribute("stroke", "#ff9800");
        this.tempLine.setAttribute("stroke-width", "2");
        this.tempLine.setAttribute("stroke-dasharray", "5,5");
        this.connectionsSvg.appendChild(this.tempLine);
    }

    updateTempLine(event) {
        if (!this.tempLine || !this.connectingFrom) return;
        
        const wsRect = this.workspace.getBoundingClientRect();
        const fromNode = this.connectingFrom.node;
        
        // Use stored coordinates for consistency
        let fromX, fromY;
        if (this.connectingFrom.connector.classList.contains('right')) {
            fromX = fromNode.x + 120; // right connector
            fromY = fromNode.y + 20;
        } else {
            fromX = fromNode.x - 8;   // left connector
            fromY = fromNode.y + 20;
        }
        
        const x2 = event.clientX - wsRect.left;
        const y2 = event.clientY - wsRect.top;
        
        this.tempLine.setAttribute("x1", fromX);
        this.tempLine.setAttribute("y1", fromY);
        this.tempLine.setAttribute("x2", x2);
        this.tempLine.setAttribute("y2", y2);
    }

    removeTempLine() {
        if (this.tempLine && this.tempLine.parentNode) {
            this.tempLine.parentNode.removeChild(this.tempLine);
        }
        this.tempLine = null;
    }

    renderConnections() {
        // Clear existing connections
        const existingLines = this.connectionsSvg.querySelectorAll('line:not([stroke-dasharray])');
        existingLines.forEach(line => line.remove());
        
        // Debug log
        console.log('Rendering connections:', this.connections.length);
        
        // Render all connections
        this.connections.forEach((connection, index) => {
            console.log(`Creating connection ${index + 1}:`, connection.from.name, '->', connection.to.name);
            const line = this.createConnectionLine(connection);
            this.connectionsSvg.appendChild(line);
        });
    }

    createConnectionLine(connection) {
        // Get the actual positions using the stored coordinates plus offsets
        const fromNode = connection.from;
        const toNode = connection.to;
        
        // Calculate connector positions based on node positions
        const fromX = fromNode.x + 120; // node width + right connector offset
        const fromY = fromNode.y + 20;  // half node height
        const toX = toNode.x - 8;       // left connector offset
        const toY = toNode.y + 20;      // half node height
        
        console.log('Connection coordinates:', { fromX, fromY, toX, toY });
        console.log('SVG dimensions:', this.connectionsSvg.clientWidth, this.connectionsSvg.clientHeight);
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", fromX);
        line.setAttribute("y1", fromY);
        line.setAttribute("x2", toX);
        line.setAttribute("y2", toY);
        line.setAttribute("stroke", "#1976d2");
        line.setAttribute("stroke-width", "3");
        line.setAttribute("opacity", "1");
        line.setAttribute("visibility", "visible");
        
        // Try without marker first to see if line appears
        // line.setAttribute("marker-end", "url(#arrowhead)");
        
        console.log('Created line element:', line);
        return line;
    }

    // Workflow Execution
    async executeWorkflow() {
        if (this.isExecuting) {
            if (window.terminalManager) {
                window.terminalManager.warning('Workflow is already executing');
            }
            return;
        }

        this.isExecuting = true;
        this.isPaused = false;
        this.updateRunButton(true);
        this.updatePauseButton(false);
        
        try {
            const startNodes = this.findStartNodes();
            const endNodes = this.findEndNodes();
            
            if (startNodes.length === 0) {
                if (window.terminalManager) {
                    window.terminalManager.error('No start nodes found. Please add a start node to begin execution.');
                }
                return;
            }

            if (endNodes.length === 0) {
                if (window.terminalManager) {
                    window.terminalManager.error('No end nodes found. Please add an end node to complete execution.');
                }
                return;
            }

            if (window.terminalManager) {
                window.terminalManager.success('Starting workflow execution...');
            }
            
            // Reset execution state if starting fresh
            if (!this.pausedAt) {
                this.resetExecutionState();
            }
            
            // Execute from each start node
            for (const startNode of startNodes) {
                if (this.isPaused) break;
                await this.executeFromNode(startNode);
            }
            
            if (!this.isPaused) {
                if (window.terminalManager) {
                    window.terminalManager.success('Workflow execution completed successfully');
                }
                this.pausedAt = null;
            }
            
        } catch (error) {
            if (window.terminalManager) {
                window.terminalManager.error(`Workflow execution failed: ${error.message}`);
            }
        } finally {
            if (!this.isPaused) {
                this.isExecuting = false;
                this.updateRunButton(false);
                this.updatePauseButton(true);
                this.currentExecutingNode = null;
            }
        }
    }

    pauseWorkflow() {
        if (!this.isExecuting) {
            if (window.terminalManager) {
                window.terminalManager.warning('No workflow is currently executing');
            }
            return;
        }

        this.isPaused = true;
        this.isExecuting = false;
        this.pausedAt = this.currentExecutingNode;
        this.updateRunButton(false);
        this.updatePauseButton(true);
        
        if (this.currentExecutingNode) {
            this.setNodeStatus(this.currentExecutingNode, 'idle');
        }
        
        if (window.terminalManager) {
            window.terminalManager.warning(`Workflow execution paused at: ${this.pausedAt?.name}`);
        }
    }

    async resumeWorkflow() {
        if (!this.isPaused || !this.pausedAt) {
            if (window.terminalManager) {
                window.terminalManager.warning('No paused workflow to resume');
            }
            return;
        }

        this.isPaused = false;
        this.isExecuting = true;
        this.updateRunButton(true);
        this.updatePauseButton(false);
        
        if (window.terminalManager) {
            window.terminalManager.info(`Resuming workflow execution from: ${this.pausedAt.name}`);
        }

        try {
            // Continue from the paused node
            await this.executeFromNode(this.pausedAt);
            
            if (!this.isPaused) {
                if (window.terminalManager) {
                    window.terminalManager.success('Workflow execution completed successfully');
                }
                this.pausedAt = null;
            }
        } catch (error) {
            if (window.terminalManager) {
                window.terminalManager.error(`Workflow execution failed: ${error.message}`);
            }
        } finally {
            if (!this.isPaused) {
                this.isExecuting = false;
                this.updateRunButton(false);
                this.updatePauseButton(true);
                this.currentExecutingNode = null;
            }
        }
    }

    async executeFromNode(startNode) {
        const visited = new Set();
        const queue = [startNode];

        while (queue.length > 0 && !this.isPaused) {
            const currentNode = queue.shift();
            
            if (visited.has(currentNode.id)) {
                continue;
            }

            // Skip nodes that have already completed successfully
            if (currentNode.status === 'completed') {
                visited.add(currentNode.id);
                const connectedNodes = this.getConnectedNodes(currentNode);
                queue.push(...connectedNodes);
                continue;
            }

            visited.add(currentNode.id);
            this.currentExecutingNode = currentNode;
            
            try {
                // Set node as running
                this.setNodeStatus(currentNode, 'running');
                if (window.terminalManager) {
                    window.terminalManager.info(`Executing: ${currentNode.name}`);
                }
                
                // Execute node based on type
                await this.executeNodeLogic(currentNode);
                
                if (this.isPaused) {
                    break;
                }
                
                // Mark as completed
                this.setNodeStatus(currentNode, 'completed');
                if (window.terminalManager) {
                    window.terminalManager.success(`Completed: ${currentNode.name}`);
                }
                
                visited.add(currentNode.id);
                const connectedNodes = this.getConnectedNodes(currentNode);
                queue.push(...connectedNodes);
                
            } catch (error) {
                this.setNodeStatus(currentNode, 'error');
                if (window.terminalManager) {
                    window.terminalManager.error(`Error executing ${currentNode.name}: ${error.message}`);
                }
                throw error;
            }
        }
    }

    async executeNodeLogic(node) {
        switch (node.type) {
            case 'start':
                // Start node - no delay
                break;
                
            case 'node1':
                // Process node makes API call if configured
                if (node.apiConfig && node.apiConfig.url) {
                    await this.makeApiCall(node);
                }
                // No default delay if no API configured
                break;
                
            case 'end':
                // End node - no delay
                break;
                
            default:
                // No default delays
                break;
        }
    }

    async makeApiCall(node) {
        const config = node.apiConfig;
        
        if (window.terminalManager) {
            window.terminalManager.info(`Making ${config.method} request to ${config.url}`);
        }
        
        try {
            let headers = {};
            try {
                headers = JSON.parse(config.headers || '{}');
            } catch (e) {
                if (window.terminalManager) {
                    window.terminalManager.warning('Invalid headers JSON, using default headers');
                }
            }
            
            const fetchOptions = {
                method: config.method,
                headers: headers,
                signal: AbortSignal.timeout(config.timeout * 1000)
            };
            
            // Add body for methods that support it
            if (['POST', 'PUT', 'PATCH'].includes(config.method) && config.body) {
                fetchOptions.body = config.body;
            }
            
            const response = await fetch(config.url, fetchOptions);
            
            if (window.terminalManager) {
                if (response.ok) {
                    window.terminalManager.success(`API call successful: ${response.status} ${response.statusText}`);
                } else {
                    window.terminalManager.warning(`API call failed: ${response.status} ${response.statusText}`);
                }
            }
            
            // You can process the response here if needed
            const data = await response.text();
            console.log('API Response:', data);
            
        } catch (error) {
            if (window.terminalManager) {
                window.terminalManager.error(`API call failed: ${error.message}`);
            }
            throw error;
        }
    }

    setNodeStatus(node, status) {
        node.status = status;
        this.updateNodeVisualStatus(node);
    }

    updateNodeVisualStatus(node) {
        node.element.classList.remove('status-idle', 'status-running', 'status-completed', 'status-error');
        node.element.classList.add(`status-${node.status}`);
        
        let indicator = node.element.querySelector('.status-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'status-indicator';
            node.element.appendChild(indicator);
        }
        
        switch (node.status) {
            case 'running':
                indicator.innerHTML = '&#9203;';
                indicator.title = 'Running';
                node.element.style.animation = 'pulse 1s infinite';
                break;
            case 'completed':
                indicator.innerHTML = '&#9989;';
                indicator.title = 'Completed';
                node.element.style.animation = '';
                break;
            case 'error':
                indicator.innerHTML = '&#10060;';
                indicator.title = 'Error';
                node.element.style.animation = '';
                break;
            default:
                indicator.innerHTML = '';
                indicator.title = '';
                node.element.style.animation = '';
                break;
        }
    }

    resetExecutionState() {
        this.nodes.forEach(node => {
            this.setNodeStatus(node, 'idle');
        });
        this.executionState.clear();
        this.currentExecutingNode = null;
        this.pausedAt = null;
    }

    hideNodeProperties() {
        this.rightDrawer.style.display = 'none';
    }

    updateNodeName(nodeObj, newName) {
        nodeObj.name = newName;
        const indicator = nodeObj.element.querySelector('.status-indicator');
        nodeObj.element.textContent = newName;
        
        if (nodeObj.leftConnector) {
            nodeObj.element.appendChild(nodeObj.leftConnector);
        }
        if (nodeObj.rightConnector) {
            nodeObj.element.appendChild(nodeObj.rightConnector);
        }
        if (indicator) {
            nodeObj.element.appendChild(indicator);
        }
    }

    showDrawerNodeInfo(nodeInfo) {
        this.rightDrawer.style.display = 'block';
        const rightDrawerContent = `
            <h3>Node Information</h3>
            <div class="node-info">
                <h4>${nodeInfo.name}</h4>
                <p><strong>Description:</strong><br>${nodeInfo.description}</p>
                <p><strong>Inputs:</strong><br>${nodeInfo.inputs}</p>
                <p><strong>Outputs:</strong><br>${nodeInfo.outputs}</p>
                <p><strong>Properties:</strong><br>${nodeInfo.properties}</p>
                <p><strong>Usage:</strong><br>${nodeInfo.usage}</p>
            </div>
            <button type="button" id="closeRightDrawer">Close</button>
        `;
        
        this.rightDrawer.innerHTML = rightDrawerContent;
        document.getElementById('closeRightDrawer').addEventListener('click', () => {
            this.hideNodeProperties();
            this.restorePropertiesPanel();
        });
    }

    restorePropertiesPanel() {
        this.rightDrawer.innerHTML = `
            <h3>Node Properties</h3>
            <form id="nodePropertiesForm">
                <label>Name:<input type="text" id="nodeName" /></label><br>
                <label>Type:<input type="text" id="nodeType" readonly /></label><br>
                <div id="apiConfig" style="display:none;">
                    <h4>API Configuration</h4>
                    <label>URL:<input type="text" id="apiUrl" placeholder="https://jsonplaceholder.typicode.com/todos/1" /></label><br>
                    <label>Method:<select id="apiMethod">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                    </select></label><br>
                    <label>Headers (JSON format):<textarea id="apiHeaders" rows="3" placeholder='{"Content-Type": "application/json"}'></textarea></label><br>
                    <label>Body (for POST/PUT/PATCH):<textarea id="apiBody" rows="4" placeholder='{"key": "value"}'></textarea></label><br>
                    <label>Timeout (seconds):<input type="number" id="apiTimeout" value="30" min="1" max="300" /></label><br>
                </div>
                <button type="button" id="closeRightDrawer">Close</button>
            </form>
        `;
        this.setupPropertyPanel();
    }

    clearExecutionState() {
        this.resetExecutionState();
    }

    updateRunButton(isRunning) {
        const runBtn = document.getElementById('runBtn');
        if (isRunning) {
            runBtn.textContent = 'Running...';
            runBtn.disabled = true;
            runBtn.style.background = '#ff9800';
        } else if (this.isPaused) {
            runBtn.textContent = 'Resume';
            runBtn.disabled = false;
            runBtn.style.background = '#4caf50';
        } else {
            runBtn.textContent = 'Run';
            runBtn.disabled = false;
            runBtn.style.background = '';
        }
    }

    updatePauseButton(disabled) {
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.disabled = disabled;
        pauseBtn.style.opacity = disabled ? '0.6' : '1';
    }

    async delayWithPauseCheck(ms) {
        const startTime = Date.now();
        while (Date.now() - startTime < ms && !this.isPaused) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    findStartNodes() {
        return this.nodes.filter(node => node.type === 'start');
    }

    findEndNodes() {
        return this.nodes.filter(node => node.type === 'end');
    }

    getConnectedNodes(node) {
        return this.connections
            .filter(conn => conn.from === node)
            .map(conn => conn.to);
    }

    generateNodeId() {
        return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    resetWorkflow() {
        this.isPaused = false;
        this.isExecuting = false;
        this.pausedAt = null;
        this.currentExecutingNode = null;
        this.updateRunButton(false);
        this.updatePauseButton(true);
        
        this.nodes.forEach(node => {
            if (node.element.parentNode) {
                node.element.parentNode.removeChild(node.element);
            }
        });
        
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.hideNodeProperties();
        this.resetExecutionState();
        this.renderConnections();
        
        if (window.terminalManager) {
            window.terminalManager.warning('Workflow reset - all nodes and connections cleared');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.workflowManager = new WorkflowManager();
});
document.addEventListener('DOMContentLoaded', () => {
    window.workflowManager = new WorkflowManager();
});
document.addEventListener('DOMContentLoaded', () => {
    window.workflowManager = new WorkflowManager();
});
