document.addEventListener('DOMContentLoaded', async function () {
    // —————— 1. 预加载顶部背景图 ——————
    const preloadTopBackground = () => {
        const bgImg = document.querySelector('.top-banner img'); 
        if (!bgImg) return Promise.resolve();

        return new Promise((resolve) => {
            if (bgImg.complete) {
                resolve();
                return;
            }
            bgImg.onload = () => {
                console.log('顶部背景图加载完成');
                resolve();
            };
            if (!bgImg.src && bgImg.dataset.src) {
                bgImg.src = bgImg.dataset.src;
            }
        });
    };

    await preloadTopBackground();


    // —————— 2. 配置参数 ——————
    const CONFIG = {
        credentials: {
            password: '123' // 实际项目需替换为安全密码
        },
        carouselTransition: 600,   // 轮播过渡时间（与 CSS transition 匹配）
        carouselInterval: 5000,    // 轮播间隔
        mobileBreakpoint: 768      // 移动端断点
    };


    // —————— 3. 元素选择器 & DOM 缓存 ——————
    const selectors = {
        mobileMenu: '.jtpl-mobile-navigation__label',
        navigation: '.jtpl-navigation',
        carouselItems: '.carousel-fixed .carousel-item',
        carouselContainer: '.carousel-fixed',
        pdfDownloadButtons: '.catalog-button.button-primary',
        pdfViewButtons: '.catalog-button.button-secondary',
        authModal: '#auth-modal',
        passwordInput: '#auth-password',
        loginButton: '#auth-login',
        cancelButton: '#auth-cancel',
        closeButton: '.close-button',
        errorMessage: '.error-message',
        contentWrapper: '.content-wrapper' // 新增内容区选择器
    };

    const elements = {};
    Object.keys(selectors).forEach(key => {
        if (key === 'carouselItems' || key === 'pdfDownloadButtons' || key === 'pdfViewButtons') {
            elements[key] = document.querySelectorAll(selectors[key]);
        } else {
            elements[key] = document.querySelector(selectors[key]);
        }
    });


    // —————— 4. 轮播容器样式修正（全屏化，解决底部露出） ——————
    if (elements.carouselContainer) {
        Object.assign(elements.carouselContainer.style, {
            position: 'fixed',
            top: '0',          
            left: '0',
            width: '100%',
            height: '100vh',  
            zIndex: '1',
            pointerEvents: 'none',
            overflow: 'hidden'
        });
    }


    // —————— 5. 内容区样式修正（顶开轮播，自然滚动） ——————
    if (elements.contentWrapper) {
        Object.assign(elements.contentWrapper.style, {
            position: 'relative',
            zIndex: '3',
            marginTop: '100vh',
            background: 'rgba(154, 205, 72)',
            overflow: 'auto' // 内容过长时允许滚动
        });
    }


    // —————— 6. 移动端菜单切换 ——————
    if (elements.mobileMenu && elements.navigation) {
        elements.mobileMenu.addEventListener('click', toggleMobileMenu);
        window.addEventListener('resize', handleResize);
        handleResize(); // 初始化响应式状态
    }

    function toggleMobileMenu() {
        const isVisible = elements.navigation.style.display === 'block';
        elements.navigation.style.display = isVisible ? 'none' : 'block';
    }

    function handleResize() {
        elements.navigation.style.display = 
            window.innerWidth > CONFIG.mobileBreakpoint 
                ? 'flex' 
                : 'none';
    }


    // —————— 7. 轮播逻辑（全屏+平滑切换+预加载） ——————
    if (elements.carouselItems.length > 0) {
        await preloadCarouselImages(); // 预加载避免切换空白

        // 初始化激活第一项
        elements.carouselItems.forEach((item, index) => {
            item.classList.toggle('active', index === 0);
        });

        let currentIndex = 0;
        let isTransitioning = false; // 防止切换重叠
        let carouselInterval;       // 轮播定时器引用

        startCarousel();

        // 切换轮播项
        function nextSlide() {
            if (isTransitioning) return; // 过渡中跳过
            isTransitioning = true;

            const nextIndex = (currentIndex + 1) % elements.carouselItems.length;
            const currentItem = elements.carouselItems[currentIndex];
            const nextItem = elements.carouselItems[nextIndex];

            // 层级控制：下一项置顶
            nextItem.style.zIndex = '2';
            currentItem.style.zIndex = '1';

            // 切换激活状态（触发 CSS 过渡）
            nextItem.classList.add('active');
            currentItem.classList.remove('active');

            // 过渡完成后重置状态
            const onTransitionEnd = () => {
                isTransitioning = false;
                currentIndex = nextIndex;
                currentItem.removeEventListener('transitionend', onTransitionEnd);
            };
            currentItem.addEventListener('transitionend', onTransitionEnd);
        }

        // 启动/重启轮播定时器
        function startCarousel() {
            if (carouselInterval) clearInterval(carouselInterval);
            carouselInterval = setInterval(nextSlide, CONFIG.carouselInterval);
        }

        // 预加载轮播图（避免切换时加载导致闪烁）
        function preloadCarouselImages() {
            const promises = [];
            elements.carouselItems.forEach(item => {
                const img = item.querySelector('img');
                if (img && !img.complete) {
                    promises.push(new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve; // 加载失败也 resolve，避免阻塞
                        // 兼容 data-src 懒加载
                        if (!img.src && img.dataset.src) {
                            img.src = img.dataset.src;
                        }
                    }));
                }
            });
            return Promise.all(promises);
        }
    }


    // —————— 8. PDF 验证逻辑（点击按钮触发认证） ——————
    if (elements.pdfDownloadButtons.length > 0 || elements.pdfViewButtons.length > 0) {
        // 下载按钮逻辑
        elements.pdfDownloadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                currentAuthRequest = { 
                    action: 'download', 
                    url: button.dataset.pdf,
                    button: button 
                };
                handleAuthentication();
            });
        });

        // 预览按钮逻辑
        elements.pdfViewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                currentAuthRequest = { 
                    action: 'view', 
                    url: button.dataset.pdf,
                    button: button 
                };
                handleAuthentication();
            });
        });
    }


    // —————— 9. 认证模态框处理（密码验证+反馈） ——————
    function handleAuthentication() {
        if (!elements.authModal || !currentAuthRequest) return;

        // 重置表单状态
        elements.passwordInput.value = '';
        elements.errorMessage.classList.remove('active');
        elements.authModal.classList.add('active');

        // 密码验证逻辑
        const authenticate = (password) => 
            password === CONFIG.credentials.password;

        // 关闭模态框（带动画）
        const closeModal = (callback) => {
            elements.authModal.classList.remove('active');
            elements.authModal.addEventListener('transitionend', function onTransitionEnd() {
                elements.authModal.removeEventListener('transitionend', onTransitionEnd);
                if (typeof callback === 'function') callback();
            }, { once: true });
        };

        // 登录按钮逻辑
        const loginHandler = () => {
            const password = elements.passwordInput.value.trim();
            if (!password) {
                elements.errorMessage.textContent = '请输入密码';
                elements.errorMessage.classList.add('active');
                return;
            }

            if (authenticate(password)) {
                closeModal(() => {
                    if (currentAuthRequest) {
                        const { action, url, button } = currentAuthRequest;
                        // 按钮加载中反馈（需在 CSS 加 .processing 样式）
                        button.classList.add('processing');
                        setTimeout(() => {
                            button.classList.remove('processing');
                            // 执行 PDF 操作
                            action === 'download' ? downloadPDF(url) : openPDF(url);
                        }, 300);
                        currentAuthRequest = null;
                    }
                });
            } else {
                elements.errorMessage.textContent = '密码错误，请重试';
                elements.errorMessage.classList.add('active');
            }
        };

        // 取消/关闭逻辑
        const cancelHandler = () => {
            closeModal();
            currentAuthRequest = null;
        };

        // 绑定一次性事件（避免重复触发）
        elements.loginButton.addEventListener('click', loginHandler, { once: true });
        elements.cancelButton.addEventListener('click', cancelHandler, { once: true });
        elements.closeButton.addEventListener('click', cancelHandler, { once: true });
        elements.authModal.addEventListener('click', (e) => {
            if (e.target === elements.authModal) {
                cancelHandler();
            }
        }, { once: true });

        // 回车键支持
        elements.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginHandler();
            }
        });
    }


    // —————— 10. PDF 操作函数 ——————
    function downloadPDF(url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = url.split('/').pop(); // 提取文件名
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function openPDF(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
});