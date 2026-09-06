//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

class ToastManager {
    constructor() {
        this.container = null;
        this.defaultDuration = 3000;
        this.toasts = new Map();
    }

    getContainer() {
        if (!this.container) {
            this.container = document.querySelector('.toast-container');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.className = 'toast-container';
                document.body.appendChild(this.container);
            }
        }
        return this.container;
    }

    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle toast-icon"></i>',
            error: '<i class="fas fa-exclamation-circle toast-icon"></i>',
            warning: '<i class="fas fa-exclamation-triangle toast-icon"></i>',
            info: '<i class="fas fa-info-circle toast-icon"></i>'
        };
        return icons[type] || icons.info;
    }

    /**
     * Show toast notification
     * @param {string} message - Text message
     * @param {string} type - Type ('success', 'error', 'warning', 'info')
     * @param {number} duration - Duration in ms (0 for manual close)
     * @param {Object} options - Additional options
     * @returns {HTMLElement} The toast element
     */
    show(message, type = 'info', duration = this.defaultDuration, options = {}) {

        const container = this.getContainer();
        const toast = document.createElement('div');

        toast.className = `toast ${type}`;

        toast.innerHTML = `
            <div class="toast-content">
                ${this.getIcon(type)}
                <span class="toast-message">${this.escapeHtml(message)}</span>
            </div>
            <div class="toast-close">
                <i class="fas fa-times"></i>
            </div>
            <div class="toast-progress"></div>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.onclick = () => this.dismiss(toast);
        container.appendChild(toast);

        // auto-dismiss
        let progressTimer = null;
        if (duration > 0) {
            const progressBar = toast.querySelector('.toast-progress');
            progressBar.style.width = '0%';
            progressBar.style.transition = `width ${duration}ms linear`;

            setTimeout(() => {
                progressBar.style.width = '100%';
            }, 10);

            const timer = setTimeout(() => {
                this.dismiss(toast);
            }, duration);

            this.toasts.set(toast, timer);
        }

        // hover pause
        if (duration > 0) {
            toast.addEventListener('mouseenter', () => {
                const timer = this.toasts.get(toast);
                if (timer) {
                    clearTimeout(timer);
                    this.toasts.delete(toast);
                }
                const progressBar = toast.querySelector('.toast-progress');
                const computedStyle = getComputedStyle(progressBar);
                const currentWidth = parseFloat(computedStyle.width);
                const totalWidth = parseFloat(computedStyle.maxWidth) || progressBar.parentElement.offsetWidth;

                progressBar.style.transition = 'none';
            });

            toast.addEventListener('mouseleave', () => {
                const progressBar = toast.querySelector('.toast-progress');
                const computedStyle = getComputedStyle(progressBar);
                const currentWidth = parseFloat(computedStyle.width);
                const totalWidth = parseFloat(computedStyle.maxWidth) || progressBar.parentElement.offsetWidth;
                const remainingPercent = (totalWidth - currentWidth) / totalWidth;
                const remainingTime = duration * remainingPercent;

                if (remainingTime > 0) {
                    progressBar.style.transition = `width ${remainingTime}ms linear`;
                    progressBar.style.width = '100%';

                    const timer = setTimeout(() => {
                        this.dismiss(toast);
                    }, remainingTime);
                    this.toasts.set(toast, timer);
                }
            });
        }

        return toast;
    }

    /**
     * Dismiss a toast
     * @param {HTMLElement} toast - Toast element
     */
    dismiss(toast) {
        if (!toast || toast.dataset.dismissing === 'true') return;

        toast.dataset.dismissing = 'true';

        // Clear auto-dismiss timer
        const timer = this.toasts.get(toast);
        if (timer) {
            clearTimeout(timer);
            this.toasts.delete(toast);
        }

        // Animate out
        toast.style.animation = 'toastSlideOutLeft 0.3s ease-out forwards';

        setTimeout(() => {
            toast.remove();

            // Remove container if empty
            if (this.container && this.container.children.length === 0) {
                this.container.remove();
                this.container = null;
            }
        }, 300);
    }

    dismissAll() {
        const toasts = [...(this.container?.children || [])];
        toasts.forEach(toast => this.dismiss(toast));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const toastManager = new ToastManager();

// Compat
function showToast(message, type = 'info', duration = 3000) {
    return toastManager.show(message, type, duration);
}