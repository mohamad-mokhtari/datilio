// Pricing Component for SaaS Data Platform
class PricingPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            plans: [],
            loading: true,
            error: null,
            isLoggedIn: false,
            currentUserPlan: null
        };
    }

    componentDidMount() {
        this.fetchPlans();
        this.checkAuthStatus();
    }

    async fetchPlans() {
        try {
            const response = await fetch('/api/v1/pricing/plans/main');
            if (!response.ok) throw new Error('Failed to fetch plans');
            const plans = await response.json();
            this.setState({ plans, loading: false });
        } catch (error) {
            this.setState({ error: error.message, loading: false });
        }
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/v1/auth/me');
            if (response.ok) {
                this.setState({ isLoggedIn: true });
                this.fetchUserPlan();
            }
        } catch (error) {
            // User not logged in
        }
    }

    async fetchUserPlan() {
        try {
            const response = await fetch('/api/v1/pricing/user/plan/with-usage');
            if (response.ok) {
                const userPlan = await response.json();
                this.setState({ currentUserPlan: userPlan });
            }
        } catch (error) {
            console.error('Failed to fetch user plan:', error);
        }
    }

    formatStorage(gb) {
        if (gb < 1) {
            return `${Math.round(gb * 1024)} MB`;
        }
        return `${gb} GB`;
    }

    formatNumber(num) {
        if (num === -1) return 'Unlimited';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    }

    async handlePlanSelect(plan) {
        if (!this.state.isLoggedIn) {
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }

        if (plan.price_monthly === 0) {
            await this.activateFreePlan(plan);
        } else {
            await this.createCheckoutSession(plan);
        }
    }

    async activateFreePlan(plan) {
        try {
            const response = await fetch('/api/v1/pricing/user/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_id: plan.id, duration_months: 1 })
            });
            
            if (response.ok) {
                this.setState({ currentUserPlan: plan });
                alert('Free plan activated successfully!');
            }
        } catch (error) {
            alert('Failed to activate free plan');
        }
    }

    async createCheckoutSession(plan) {
        try {
            const response = await fetch('/api/v1/pricing/stripe/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_id: plan.id, duration_months: 1 })
            });
            
            if (response.ok) {
                const { checkout_url } = await response.json();
                window.location.href = checkout_url;
            }
        } catch (error) {
            alert('Failed to create checkout session');
        }
    }

    renderPlanCard(plan) {
        const isCurrentPlan = this.state.currentUserPlan?.id === plan.id;
        const isPopular = plan.name === 'Pro';
        
        return (
            <div key={plan.id} className={`plan-card ${isPopular ? 'popular' : ''} ${isCurrentPlan ? 'current' : ''}`}>
                {isPopular && <div className="popular-badge">Most Popular</div>}
                {isCurrentPlan && <div className="current-badge">Current Plan</div>}
                
                <div className="plan-header">
                    <h3 className="plan-name">{plan.name}</h3>
                    <p className="plan-description">{plan.description}</p>
                    <div className="plan-price">
                        <span className="price-amount">${plan.price_monthly}</span>
                        <span className="price-period">/month</span>
                    </div>
                </div>

                <div className="plan-features">
                    <div className="feature-group">
                        <h4>📁 File Upload</h4>
                        <ul>
                            <li>{plan.file_limit} file{plan.file_limit !== 1 ? 's' : ''} max</li>
                            <li>Up to {plan.file_size_limit_mb}MB per file</li>
                            <li>{this.formatStorage(plan.storage_limit_gb)} total storage</li>
                        </ul>
                    </div>

                    <div className="feature-group">
                        <h4>🔍 Rules & Filters</h4>
                        <ul>
                            <li>{this.formatNumber(plan.rules_limit)} active rules</li>
                            <li>{this.formatNumber(plan.custom_lists_limit)} custom lists</li>
                        </ul>
                    </div>

                    <div className="feature-group">
                        <h4>🤖 AI Features</h4>
                        <ul>
                            <li>{this.formatNumber(plan.ai_prompts_per_month)} prompts/month</li>
                            <li>{this.formatNumber(plan.ai_tokens_per_month)} tokens/month</li>
                            <li>{this.formatNumber(plan.synthetic_rows_per_month)} synthetic rows/month</li>
                        </ul>
                    </div>

                    <div className="feature-group">
                        <h4>✨ Additional Features</h4>
                        <ul>
                            {plan.priority_processing && <li>⚡ Priority processing</li>}
                            {plan.team_sharing && <li>👥 Team sharing</li>}
                            {plan.features?.data_viewer && <li>👁️ Data viewer</li>}
                            {plan.features?.advanced_analytics && <li>📈 Advanced analytics</li>}
                            {plan.features?.custom_dashboards && <li>🎛️ Custom dashboards</li>}
                            {plan.features?.api_access && <li>🔌 API access</li>}
                            {plan.features?.white_label && <li>🏷️ White label</li>}
                        </ul>
                    </div>
                </div>

                <div className="plan-actions">
                    {isCurrentPlan ? (
                        <button className="btn btn-secondary" disabled>
                            Current Plan
                        </button>
                    ) : (
                        <button 
                            className={`btn ${plan.price_monthly === 0 ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => this.handlePlanSelect(plan)}
                        >
                            {plan.price_monthly === 0 ? 'Get Started Free' : 'Choose Plan'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    render() {
        if (this.state.loading) {
            return (
                <div className="pricing-container">
                    <div className="loading">Loading plans...</div>
                </div>
            );
        }

        if (this.state.error) {
            return (
                <div className="pricing-container">
                    <div className="error">Error: {this.state.error}</div>
                </div>
            );
        }

        return (
            <div className="pricing-container">
                <div className="pricing-header">
                    <h1>Choose Your Plan</h1>
                    <p>Start with our free plan and upgrade as you grow</p>
                </div>

                <div className="plans-grid">
                    {this.state.plans.map(plan => this.renderPlanCard(plan))}
                </div>

                <div className="pricing-footer">
                    <h3>Need more? Add-ons available</h3>
                    <div className="addons-grid">
                        <div className="addon-card">
                            <h4>Extra Storage</h4>
                            <p>$2/GB/month</p>
                        </div>
                        <div className="addon-card">
                            <h4>Extra Tokens</h4>
                            <p>$3/100k tokens</p>
                        </div>
                        <div className="addon-card">
                            <h4>Extra Synthetic Data</h4>
                            <p>$2/10k rows</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

// Export for use
window.PricingPage = PricingPage;
