/**
 * GlobalSend Client-side Micro-interactions
 * Lightweight, zero-dependency vanilla JS matching Apple HIG
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Copy to clipboard helper
    document.querySelectorAll('[data-copy]').forEach(el => {
        el.addEventListener('click', async (e) => {
            e.preventDefault();
            const textToCopy = el.getAttribute('data-copy');
            try {
                await navigator.clipboard.writeText(textToCopy);
                showToast('Copied to clipboard');
            } catch (err) {
                // Fallback
                const textarea = document.createElement('textarea');
                textarea.value = textToCopy;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showToast('Copied to clipboard');
            }
        });
    });

    // 2. Drag & Drop File Zone Enhancement
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');

    if (dropZone && fileInput) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--apple-blue)';
                dropZone.style.backgroundColor = 'var(--apple-blue-light)';
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--apple-card-border)';
                dropZone.style.backgroundColor = '';
            });
        });

        dropZone.addEventListener('drop', (e) => {
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = e.dataTransfer.files[0].name;
                }
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files.length > 0 && fileNameDisplay) {
                fileNameDisplay.textContent = fileInput.files[0].name;
            }
        });
    }

    // 3. Auto-scroll chat to bottom
    const chatBox = document.getElementById('chat-messages');
    if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});

function showToast(message) {
    let toast = document.getElementById('apple-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'apple-toast';
        toast.style.position = 'fixed';
        toast.style.bottom = '28px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.background = 'rgba(29, 29, 31, 0.9)';
        toast.style.backdropFilter = 'blur(16px)';
        toast.style.color = '#ffffff';
        toast.style.padding = '10px 22px';
        toast.style.borderRadius = '9999px';
        toast.style.fontSize = '14px';
        toast.style.fontWeight = '500';
        toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
        toast.style.zIndex = '99999';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2500);
}
