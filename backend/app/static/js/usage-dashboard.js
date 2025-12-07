// Usage Dashboard Component
class UsageDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            usageSummary: null,
            loading: true,
            error: null
        };
    }

    componentDidMount() {
        this.fetchUsageSummary();
    }

    async fetchUsageSummary() {
        try {
            const response = await fetch('/api/v1/pricing/user/usage/summary');
            if (!response.ok) throw new Error('Failed to fetch usage summary');
            const usageSummary = await response.json();
            this.setState({ usageSummary, loading: false });
        } catch (error) {
            this.setState({ error: error.message, loading: false });
        }
    }

    formatStorage(mb) {
        if (mb < 1024) {
            return `${Math.round(mb)} MB`;
        }
        return `${(mb / 1024).toFixed(1)} GB`;
    }

    formatNumber(num) {
        if (num === -1 || num === Infinity) return 'Unlimited';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    }

    getUsagePercentage(current, limit) {
        if (limit <= 0 || limit === Infinity) return 0;
        return Math.min((current / limit) * 100, 100);
    }

    getProgressBarClass(percentage) {
        if (percentage >= 90) return 'danger';
        if (percentage >= 75) return 'warning';
        return '';
    }

    renderUsageCard(feature, current, limit) {
        const percentage = this.getUsagePercentage(current, limit);
        const progressClass = this.getProgressBarClass(percentage);
        
        const featureLabels = {
            'file_storage_mb': 'File Storage',
            'rules_used': 'Active Rules',
            'openai_tokens': 'AI Tokens',
            'synthetic_rows': 'Synthetic Data',
            'custom_lists': 'Custom Lists'
        };

        const featureIcons = {
            'file_storage_mb': '📁',
            'rules_used': '🔍',
            'openai_tokens': '🤖',
            'synthetic_rows': '📊',
            'custom_lists': '📋'
        };

        return (
            <div key={feature} className="usage-card">
                <h3>
                    {featureIcons[feature]} {featureLabels[feature]}
                </h3>
                <div className="usage-stats">
                    <span className="usage-current">
                        {feature === 'file_storage_mb' 
                            ? this.formatStorage(current)
                            : this.formatNumber(current)
                        }
                    </span>
                    <span className="usage-limit">
                        {feature === 'file_storage_mb'
                            ? this.formatStorage(limit)
                            : this.formatNumber(limit)
                        }
                    </span>
                </div>
                <div className="usage-bar">
                    <div 
                        className={`usage-progress ${progressClass}`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
                <div className="usage-percentage">
                    {percentage > 0 ? `${percentage.toFixed(1)}% used` : '0% used'}
                </div>
            </div>
        );
    }

    render() {
        if (this.state.loading) {
            return (
                <div className="usage-dashboard">
                    <div className="loading">Loading usage data...</div>
                </div>
            );
        }

        if (this.state.error) {
            return (
                <div className="usage-dashboard">
                    <div className="error">Error: {this.state.error}</div>
                </div>
            );
        }

        if (!this.state.usageSummary) {
            return (
                <div className="usage-dashboard">
                    <div className="error">No usage data available</div>
                </div>
            );
        }

        const { current_month, limits } = this.state.usageSummary;

        return (
            <div className="usage-dashboard">
                <div className="usage-header">
                    <h2>Usage Dashboard</h2>
                    <button 
                        className="btn btn-secondary"
                        onClick={() => this.fetchUsageSummary()}
                    >
                        Refresh
                    </button>
                </div>
                
                <div className="usage-grid">
                    {Object.keys(limits).map(feature => 
                        this.renderUsageCard(
                            feature, 
                            current_month[feature] || 0, 
                            limits[feature]
                        )
                    )}
                </div>

                <div className="usage-actions">
                    <button 
                        className="btn btn-primary"
                        onClick={() => window.location.href = '/pricing'}
                    >
                        Upgrade Plan
                    </button>
                    <button 
                        className="btn btn-secondary"
                        onClick={() => window.location.href = '/billing'}
                    >
                        Manage Billing
                    </button>
                </div>
            </div>
        );
    }
}

// Export for use
window.UsageDashboard = UsageDashboard;
