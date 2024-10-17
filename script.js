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

    constructor() {
        this.state = { ...this.initialState };
        this.bindEvents();
    }

    resetState() {
        this.state = { ...this.initialState };
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
        console.log(this.state);
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

    bindEvents() {
        document.addEventListener('pointerdown', (evt) => this.onPointerDown(evt));
        document.addEventListener('pointermove', (evt) => this.onPointerMove(evt));
        document.addEventListener('pointerup', () => this.onPointerUp());
    }
}

new ProductsCreator();
new DragAndDrop();
