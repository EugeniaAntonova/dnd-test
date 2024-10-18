class ProductsCreator {
    constructor() {
        this.getData(this.onDataSuccess, this.onDataFail);
        this.shelfes = [...document.querySelectorAll('.shelf')];
        this.stall = document.querySelector('.shelfes');
        this.products = [];

    }

    selectors = {
        element: 'data-product-dnd',
    }

    constants = {
        imgPath: './assets/',
        animationDelay: 1.4
    }

    positionProduct() {
        let stallTop = this.stall.offsetTop;
        let stallLeft = this.stall.offsetLeft;
        let shelfWidth = this.shelfes[0].offsetWidth;
        let startingIndex = 0;
        this.shelfes.forEach(shelf => {
            let shelTop = shelf.offsetTop;
            let shelLeft = shelf.offsetLeft;
            let shelfHeight = shelf.offsetHeight;
            let capacity = parseInt(shelf.dataset.shelfCapacity);
            let productsForShelf = this.products.slice(startingIndex, startingIndex + capacity);
            let gap = Math.floor((shelfWidth - getProductsWidth(productsForShelf)) / capacity);
            let accumulatedWidth = 0;
            productsForShelf.forEach((product, index) => {
                let productWidth = product.querySelector('img').width;
                let productHeight = product.querySelector('img').height;
                let top = stallTop + shelTop + shelfHeight - productHeight + 10;
                let left = stallLeft + shelLeft + gap * (index + 1) + accumulatedWidth;
                product.style.setProperty('--top', `${top}px`);
                product.style.setProperty('--left', `${left}px`);
                accumulatedWidth += productWidth;
            })
            startingIndex += capacity;
        })
        function getProductsWidth(products) {
            return products.reduce((accumulator, item) => accumulator + item.querySelector('img').width, 0);
        }
    }

    createProduct(product) {
        const { img, name, width, height } = { ...product };
        const wrapper = document.createElement('div');
        wrapper.classList.add(`${name}`, 'draggable');
        wrapper.setAttribute(this.selectors.element, true);
        wrapper.insertAdjacentHTML('beforeend', `<img src="${this.constants.imgPath + img}" width="${width}"  height="${height}">`);
        this.products.push(wrapper);
    }

    onDataSuccess = (data) => {
        data.forEach((product) => { this.createProduct(product) });
        this.positionProduct();
        this.products.forEach((product, index) => {
            product.style.setProperty('--delay', `${this.constants.animationDelay + index / 10}s`);
            document.body.append(product);
        });
        window.addEventListener('resize', () => this.positionProduct())
    }

    onDataFail = (error) => {
        console.log(error)
    }

    getData = async (onSuccess, onFail) => {
        try {
            const response = await fetch(
                './data.json'
            );

            if (!response.ok) {
                throw new Error('Не удалось получить данные');
            }

            const resp = await response.json();
            const data = resp.data;
            onSuccess(data);
        } catch (error) {
            onFail(error.message);
        }
    };
}

class DragAndDrop {
    selectors = {
        root: '[data-product-dnd]',
    }

    stateClasses = {
        isDragging: 'is-dragging',
    }

    initialState = {
        offsetX: null,
        offsetY: null,
        isDragging: false,
        currentDraggingElement: null,
    }

    startingPosition = {
        startingX: 0,
        startingY: 0,
    }

    constructor() {
        this.state = { ...this.initialState };
        this.isMobile = this.isItMobileDevice();
        this.bindEvents(this.isMobile);
    }

    resetState() {
        this.state.currentDraggingElement.style.setProperty('--left', `${this.startingPosition.startingX}`);
        this.state.currentDraggingElement.style.setProperty('--top', `${this.startingPosition.startingY}`);
        this.state = { ...this.initialState };
    }

    onTouchStart(evt) {
        const {target} = evt;
        const isDraggable = target.matches(this.selectors.root);
        if (!isDraggable) return;

        evt.target.classList.add(this.stateClasses.isDragging);
        const { left, top } = target.getBoundingClientRect();

        const firstTouch = evt.touches[0];

        this.state = {
            offsetX: firstTouch.clientX - left,
            offsetY: firstTouch.clientY - top,
            isDragging: true,
            currentDraggingElement: target
        }

        this.startingPosition.startingX =  window.getComputedStyle(target).left;
        this.startingPosition.startingY = window.getComputedStyle(target).top;
        console.log(this.startingPosition);
    }

    onTouchMove(evt) {
        if (!this.state.isDragging) return;

        const x = evt.touches[0].clientX - this.state.offsetX;
        const y = evt.touches[0].clientY - this.state.offsetY;
        
        requestAnimationFrame(() => {
            this.state.currentDraggingElement.style.setProperty('--left', `${x}px`);
            this.state.currentDraggingElement.style.setProperty('--top', `${y}px`);
        });
    }

    onTouchEnd() {
        if (!this.state.isDragging) return;

        this.state.currentDraggingElement.classList.remove('is-dragging');
        this.resetState()
    }

    onPointerDown(evt) {
        const { target, x, y } = evt;
        const isDraggable = target.matches(this.selectors.root);
        if (!isDraggable) return;

        evt.target.classList.add(this.stateClasses.isDragging);
        const { left, top } = target.getBoundingClientRect();
        this.state = {
            offsetX: x - left,
            offsetY: y - top,
            isDragging: true,
            currentDraggingElement: target
        }
    }

    onPointerMove(evt) {
        if (!this.state.isDragging) return;

        const x = evt.pageX - this.state.offsetX;
        const y = evt.pageY - this.state.offsetY;

        requestAnimationFrame(() => {
            this.state.currentDraggingElement.style.setProperty('--left', `${x}px`);
            this.state.currentDraggingElement.style.setProperty('--top', `${y}px`);
        });
    }

    onPointerUp() {
        if (!this.state.isDragging) return;

        this.state.currentDraggingElement.classList.remove('is-dragging');
        this.resetState()
    }

    isItMobileDevice() {
        const reMobiles = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Touch|pixel/i;
        const reMac = /Macintosh/i;
        const agent = navigator.userAgent;

        const isMobile = reMobiles.test(agent);
        const isBigIpad = reMac.test(agent) && navigator.maxTouchPoints > 0;
        const isSmall = Math.max(window.innerHeight, window.innerWidth) <= 1600 && navigator.maxTouchPoints > 0;
        const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

        return isMobile || isBigIpad || isSmall || hasCoarsePointer;
    };

    bindEvents(isMobile) {
        if (isMobile) {
            document.addEventListener('touchstart', (evt) => this.onTouchStart(evt));
            document.addEventListener('touchmove', (evt) => this.onTouchMove(evt));
            document.addEventListener('touchend', () => this.onTouchEnd());
            return;
        }
        document.addEventListener('pointerdown', (evt) => this.onPointerDown(evt));
        document.addEventListener('pointermove', (evt) => this.onPointerMove(evt));
        document.addEventListener('pointerup', () => this.onPointerUp());
    }
}

new ProductsCreator();
new DragAndDrop();

// const touchCoords = {
//     x: 0,
//     y: 0
// };


// document.addEventListener('touchstart', (evt) => {
//     if (!evt.target.classList.contains('draggable')) return;
//     const firstTouch = evt.touches[0];
//     touchCoords.x = firstTouch.clientX;
//     touchCoords.y = firstTouch.clientY;

//     document.addEventListener('touchmove', handleTouchMove);
// })

// document.addEventListener('touchend', () => {
//     document.removeEventListener('touchmove', handleTouchMove);
// })

// function onTouchMove(evt) {
//     console.log('move', evt);
// }

// function handleTouchMove(event) {
//     if (!touchCoords.x || !touchCoords.y) {
//         return;
//     }

//     const { x, y } = touchCoords;

//     // Сохраняем текущие координаты
//     const xUp = event.touches[0].clientX;
//     const yUp = event.touches[0].clientY;
//     console.log({ xUp, yUp });
// }