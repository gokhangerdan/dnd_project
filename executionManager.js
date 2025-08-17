/**
 * Execution Manager - Handles workflow execution logic
 */

class ExecutionManager {
    constructor(workflowManager) {
        this.workflowManager = workflowManager;
    }

    async executeNodeLogic(node) {
        switch (node.type) {
            case 'start':
                await this.workflowManager.delayWithPauseCheck(1000);
                break;
                
            case 'node1':
                if (node.apiConfig && node.apiConfig.url) {
                    await this.makeApiCall(node);
                } else {
                    await this.workflowManager.delayWithPauseCheck(2000);
                }
                break;
                
            case 'end':
                await this.workflowManager.delayWithPauseCheck(1000);
                break;
                
            default:
                await this.workflowManager.delayWithPauseCheck(2000);
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
            
            const data = await response.text();
            console.log('API Response:', data);
            
        } catch (error) {
            if (window.terminalManager) {
                window.terminalManager.error(`API call failed: ${error.message}`);
            }
            throw error;
        }
    }
}
