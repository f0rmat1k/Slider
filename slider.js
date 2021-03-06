
var Slider = (function ($, global) {
    'use strict';

    var defaultOptions = {
        root: '',
        items: '',
        markerTemplate: '<span class="sliderMarker" />',
        slide: 1,
        visible: 1,
        cycle: true,
        auto: 0,
        markers: false,
        base: null,
        navBlock: null,
        speed: 500
    },
        bindEvents,
        init,
        checkForCssPropsSupport,
        updateDimension,
        slideTo,
        slideToCustomSlide,
        addNavMarkers,
        currentMarkerClass = 'sliderMarker_current_js',
        disabledControlClass = 'slider-control_disabled_js',
        hasTransitions,
        hasTranslate3D,
        cssPrefix = "",
        touchTimer = 0,
        detectPrefix,
        defineSlideMethod,
        touch,
        ontransitionend,
        animateWithBestMethod,
        currentSlideIndex = 0,
        updateCurrentMarker,
        updateControlsState,
        prepareLayout,
        makeSliderHtml,
        $global = $(global),
        addBasicStyles,
        extendLeftItemsBlock,
        extendRightItemsBlock,
        slideNext,
        slidePrev,
        module = function () {
            init.apply(this, arguments);
        };

    init = function (params) {
        this.options = $.extend({}, defaultOptions, params);
        this.$base = $(this.options.base);
        this.$root = $(this.options.root);
        this.$items = $(this.options.items);
        this.$container = $(this.options.container);
        this.$navBlock = $(this.options.navBlock);
        this.$markers = $();

        detectPrefix();
        makeSliderHtml.call(this);
        addBasicStyles.call(this);
        updateDimension.call(this);
        prepareLayout.call(this);
        updateControlsState.call(this);
        checkForCssPropsSupport.call(this);
        defineSlideMethod.call(this);
        bindEvents.call(this);
    };

    detectPrefix = function () {
        if ($.browser.msie && $.browser.version < 9) {
            return;
        }
        var styles = window.getComputedStyle(document.documentElement, '');
        cssPrefix = '-' + (Array.prototype.slice.call(styles).join('').match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1] + '-';
    };

    //private methods
    makeSliderHtml = function () {
        var limiter = $('<div style="height: 100%;overflow: hidden; position: relative;" class="slider-limiter"></div>'),
            prevControl,
            nextControl;
        this.$root = $('<div data-role="root" class="slider-root" />');

        this.$root.append(limiter);
        this.$container = $('<div data-role="container" class="slider-container" />');
        limiter.append(this.$container);
        this.$container.append(this.$items);

        if (this.options.markers) {
            this.$navBlock = $('<div class="slider-nav" style="bottom: 8px; left: 60px; position: absolute; z-index: 3;"/>');
            this.$markersBlock = $('<div class="slider-markers" style="display: inline-block; vertical-align: middle; *display: inline; *zoom: 1; border: 1px solid transparent;" />');
            this.$navBlock.append(this.$markersBlock);
            this.$root.append(this.$navBlock);
            addNavMarkers.call(this);
        }

        if (!this.options.prevControl) {
            this.options.prevControl = '[data-role="prevControl"]';
            prevControl = $('<div data-role="prevControl" class="slider-prevControl" />');
            if (this.options.markers) {
                prevControl.prependTo(this.$navBlock);
            } else {
                this.$root.append(prevControl);
            }
        }
        if (!this.options.nextControl) {
            this.options.nextControl = '[data-role="nextControl"]';
            nextControl = $('<div data-role="nextControl" class="slider-nextControl" />');
            if (this.options.markers) {
                nextControl.appendTo(this.$navBlock);
            } else {
                this.$root.append(nextControl);
            }
        }

        this.$base.append(this.$root);
        this.$prevControl = this.$base.find(this.options.prevControl);
        this.$nextControl = this.$base.find(this.options.nextControl);
    };

    addBasicStyles = function () {
        this.$root.css({
            height: '100%',
            position: 'relative',
            userSelect: 'none'
        });

        this.$container.css({
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            minWidth: '100%'
        }).css(cssPrefix + 'transition', cssPrefix + 'transform ' + this.options.speed + 'ms ease-in-out');

        this.$items.css({
            'float': 'left',
            height: '100%'
        });
    };
    extendLeftItemsBlock = function () {
        this.extendLeftCount += 1;
        var deeperContainer = this.$leftContainer.clone().css('right', 100 * this.extendLeftCount + '%');
        deeperContainer.appendTo(this.$container);
        this.$leftContainer = deeperContainer;
        this.options.additionalLeftSlidesCount += this.options.itemsStepCount;
    };
    extendRightItemsBlock = function () {
        this.extendRightCount += 1;
        var deeperContainer = this.$rightContainer.clone().css('left', 100 * this.extendRightCount + '%');
        deeperContainer.appendTo(this.$container);
        this.$rightContainer = deeperContainer;
        this.options.additionalRightSlidesCount += this.options.itemsStepCount;
    };
    prepareLayout = function () {
        if (this.options.cycle) {
            this.$leftContainer = $('<div class="sliderLeftContainer" style="position: absolute; height: 100%; right: 100%; min-width: 100%; width: 100%; top: 0; *zoom: 1;" />');
            this.$rightContainer = $('<div class="sliderRightContainer" style="position: absolute; height: 100%; left: 100%; min-width: 100%; width: 100%; top: 0; *zoom: 1;" />');

            var itemsSize = this.$items.size();
            this.options.additionalLeftSlidesCount = itemsSize;
            this.options.additionalRightSlidesCount = itemsSize;
            this.options.itemsStepCount = itemsSize;

            this.$leftContainer.append(this.$items.clone());
            this.$rightContainer.append(this.$items.clone());

            this.$container.append(this.$leftContainer);
            this.$container.append(this.$rightContainer);

            this.extendLeftCount = 1;
            this.extendRightCount = 1;

            this.options.currentMarkerIndex = 0;
        }
    };
    checkForCssPropsSupport = function () {
        var s = document.createElement('p').style;
        hasTransitions = 'transition' in s ||
            'WebkitTransition' in s ||
            'MozTransition' in s ||
            'msTransition' in s ||
            'OTransition' in s;

        hasTranslate3D = function () {
            var el = document.createElement('p'),
                has3D,
                transforms = {
                    'webkitTransform': '-webkit-transform',
                    'OTransform': '-o-transform',
                    'msTransform': '-ms-transform',
                    'MozTransform': '-moz-transform',
                    'transform': 'transform'
                };

            // Add it to the body to get the computed style.
            document.body.insertBefore(el, null);

            for (var t in transforms) {
                if (el.style[t] !== undefined) {
                    el.style[t] = "translate3d(1px,1px,1px)";
                    has3D = window.getComputedStyle(el).getPropertyValue(transforms[t]);
                }
            }

            document.body.removeChild(el);

            return (has3D !== undefined && has3D.length > 0 && has3D !== "none");
        }();
    };

    updateControlsState = function () {
        if (this.options.cycle) {
            return;
        }
        this.$nextControl.removeClass(disabledControlClass);
        this.$prevControl.removeClass(disabledControlClass);

        if (currentSlideIndex + 1 === this.$items.size()) {
            this.$nextControl.addClass(disabledControlClass);
        }
        if (currentSlideIndex === 0) {
            this.$prevControl.addClass(disabledControlClass);
        }
    };
    bindEvents = function () {
        this.$root.on('click.slider', this.options.nextControl, $.proxy(function () {
            slideNext.call(this);
        }, this));
        this.$root.on('click.slider', this.options.prevControl, $.proxy(function () {
            slidePrev.call(this);
        }, this));

        var p = document.createElement('p');
        if (p.addEventListener) {
            this.$container[0].addEventListener("touchstart", $.proxy(function (e) {
                touch.onTouchStart.call(this, e);
            }, this), false);

            this.$container[0].addEventListener("touchmove", $.proxy(function (e) {
                touch.onTouchMove.call(this, e);
            }, this), false);

            this.$container[0].addEventListener("touchend", $.proxy(function (e) {
                e.preventDefault();
                touch.onTouchEnd.call(this);
            }, this), false);
        }

        if (this.options.markers) {
            this.$root.on('click.slider', '[data-bind="marker"]', $.proxy(function (e) {
                var $marker = $(e.target),
                    index = $marker.index();

                if (!$marker.hasClass(currentMarkerClass)) {
                    slideToCustomSlide.apply(this, [index]);
                }
            }, this));
        }

        if (this.options.auto) {
            this.options.autoTimer = 0;
            this.options.autoTimer = setInterval($.proxy(function () {
                slideNext.call(this);
            }, this), this.options.auto);

            this.$root
                .on('mouseenter.slider', $.proxy(function () {
                    clearInterval(this.options.autoTimer);
                    this.$root.trigger('slider.stopAutoTimer', [this.options.currentMarkerIndex]);
                }, this))
                .on('mouseleave.slider', $.proxy(function () {
                    this.options.autoTimer = setInterval($.proxy(function () {
                        slideNext.call(this);
                        this.$root.trigger('slider.autoSlideNext');
                    }, this), this.options.auto);
                }, this));
        }

/*        (function () {
            var myDiv;
            myDiv = document.createElement('DIV');
            if ('ontransitionend' in window) {
                ontransitionend = 'transitionend';
            } else if ('onwebkittransitionend' in window) {
                ontransitionend = 'webkitTransitionEnd';
            } else if ('onotransitionend' in myDiv || navigator.appName == 'Opera') {
                ontransitionend = 'oTransitionEnd';
            } else {
                ontransitionend = false;
            }
        })();

        if (ontransitionend) {
            this.$container[0].addEventListener(ontransitionend, $.proxy(function () {
                this.$container.css(cssPrefix + 'transition', cssPrefix + 'transform ' + this.options.speed + 'ms ease-in-out');
            }, this), false);
        }*/
    };
    touch = {
        onTouchStart: function (e) {
            if (e.touches.length != 1 || this.touchStarted) {
                return;
            }

            this.touchDetecting = true;
            this.touch = e.changedTouches[0];
            this.pageX = this.touch.pageX;
            this.pageY = this.touch.pageY;
            this.offsetValue = this.$container.css(cssPrefix + 'transform').replace('matrix(', '').split(', ')[4] || 0;
        },
        onTouchMove: function (e) {
            if (!this.touchStarted && !this.touchDetecting) {
                return;
            }

            if (this.touchDetecting) {
                touch.detectTouchMove.call(this, e);
            }

            if (this.touchStarted) {
                touch.draw.call(this, e);
            }
        },
        onTouchEnd: function () {
            if (this.touchStarted) {
                this.delta < 0 ? slideNext.call(this) : slidePrev.call(this);
            }

            this.touchStarted = false;
            this.touchDetecting = false;

            this.$container.css(cssPrefix + 'transition', cssPrefix + 'transform ' + this.options.speed + 'ms ease-out');
        },
        detectTouchMove: function (e) {
            if (Math.abs(this.pageX - e.changedTouches[0].pageX) >= Math.abs(this.pageY - e.changedTouches[0].pageY)) {
                e.preventDefault();

                //log.text(this.touchTimer);
                this.touchStarted = true;
                this.touchDetecting = false;
                this.$container.css(cssPrefix + 'transition', 'none');
            } else {
                this.touchStarted = false;
                this.touchDetecting = false;
            }
        },
        draw: function (e) {
            e.preventDefault();
            this.delta = (this.pageX - e.changedTouches[0].pageX) * -1;
            touch.moveTo.call(this);
        },
        moveTo: function () {
            var val = this.offsetValue * 1 + this.delta;
            //log.text(this.offsetValue);
            this.$container.css(cssPrefix + 'transform', 'translate3d(' + val + 'px, 0, 0)');
        }
    };
    updateCurrentMarker = function (index) {
        if (!this.options.markers) {
            return;
        }
        this.$markers.removeClass(currentMarkerClass);
        this.$markers.eq(index).addClass(currentMarkerClass);
    };
    addNavMarkers = function () {
        var $markerTemplate = $(this.options.markerTemplate);
        $markerTemplate.attr('data-bind', 'marker');
        this.options.currentMarkerIndex = 0;
        this.options.markerSize = 0;
        this.$items.each($.proxy(function () {
            var marker = $markerTemplate.clone();
            this.$markers = this.$markers.add(marker);
            this.$markersBlock.append(marker);
            this.options.markerSize += 1;
        }, this));
        this.$markers.first().addClass(currentMarkerClass);

    };
    updateDimension = function () {
        var width = 100 + (100 / this.options.visible * (this.$items.size() - this.options.visible));
        this.$container.width(width + '%');
        this.$items.width(100 / this.$items.size() + '%');
    };

    defineSlideMethod = function () {
        if (hasTransitions) {
            if (hasTranslate3D) {
                animateWithBestMethod = function (index) {
                    this.$container.css('transform', 'translate3d(' + (100 / this.$items.size()) * -index + '%, 0, 0)');
                };
            } else {
                animateWithBestMethod = function (index) {
                    this.$container.css('transform', 'translate(' + (100 / this.$items.size()) * -index + '%, 0)');
                };
            }
        } else {
            animateWithBestMethod = function (index) {
                this.$container.stop(true, false).animate({
                    marginLeft: (100 / this.options.visible) * -index + '%'
                }, this.options.speed);
            };
        }
    };

    slideTo = function (index) {
        index = parseInt(index, 10);
        this.$root.trigger('slider.slideTo', [this.options.currentMarkerIndex]);
        animateWithBestMethod.call(this, index);
    };

    slideToCustomSlide = function (index) {
        currentSlideIndex += index - this.options.currentMarkerIndex;

        this.options.currentMarkerIndex = index;
        slideTo.apply(this, [currentSlideIndex]);
        updateControlsState.call(this);
        updateCurrentMarker.apply(this, [this.options.currentMarkerIndex]);
    };
    slideNext = function () {
        if (this.options.cycle) {
            if (this.options.currentMarkerIndex === this.$items.size() - 1) {
                this.options.currentMarkerIndex = 0;
            } else {
                this.options.currentMarkerIndex += this.options.slide;
            }

            if (currentSlideIndex > 0 && this.options.additionalRightSlidesCount - currentSlideIndex <= this.options.visible * 2) {
                extendRightItemsBlock.call(this);
            }
        } else if (currentSlideIndex !== this.$items.size() - 1) {
            this.options.currentMarkerIndex += this.options.slide;
        }

        currentSlideIndex += this.options.slide;

        updateCurrentMarker.apply(this, [this.options.currentMarkerIndex]);
        updateControlsState.call(this);
        this.$root.trigger('slider.slideNext', [this.options.currentMarkerIndex]);
        slideTo.apply(this, [currentSlideIndex]);
    };
    slidePrev = function () {
        if (this.options.cycle) {
            if (this.options.currentMarkerIndex === 0) {
                this.options.currentMarkerIndex = this.$items.size() - 1;
            } else {
                this.options.currentMarkerIndex -= this.options.slide;
            }

            if (currentSlideIndex < 0 && this.options.additionalLeftSlidesCount - Math.abs(currentSlideIndex) <= this.options.visible * 2) {
                extendLeftItemsBlock.call(this);
            }
        } else if (currentSlideIndex !== 0) {
            this.options.currentMarkerIndex -= this.options.slide;
        }

        currentSlideIndex -= this.options.slide;

        updateCurrentMarker.apply(this, [this.options.currentMarkerIndex]);
        updateControlsState.call(this);
        this.$root.trigger('slider.slidePrev', [this.options.currentMarkerIndex]);
        slideTo.apply(this, [currentSlideIndex]);
    };

    //public methods
    module.prototype.updateDimension = function () {
        updateDimension.call(this);
        return this;
    };
    module.prototype.slideTo = function (index) {
        slideToCustomSlide.apply(this, [index]);
        return this;
    };
    module.prototype.setVisible = function (amount) {
        if (amount > this.$items.size()) {
            amount = this.$items.size();
        }
        this.options.visible = amount;
        updateDimension.call(this);
        slideTo.apply(this, [currentSlideIndex]);
        return this;
    };
    module.prototype.setSlide = function (amount) {
        this.options.slide = amount;
        return this;
    };
    module.prototype.slideNext = function () {
        slideNext.call(this);
        return this;
    };
    module.prototype.slidePrev = function () {
        slidePrev.call(this);
        return this;
    };
    module.prototype.getOptions = function () {
        return this.options;
    };

    return module;
})(jQuery, window);
