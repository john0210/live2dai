/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismFramework, Option } from '@framework/live2dcubismframework';
import * as LAppDefine from './lappdefine';
import { LAppPal } from './lapppal';
import { LAppSubdelegate } from './lappsubdelegate';
import { CubismLogError } from '@framework/utils/cubismdebug';

export let s_instance: LAppDelegate = null;

/**
 * Live2D application delegate
 */
export class LAppDelegate {

  /**
   * Singleton
   */
  public static getInstance(): LAppDelegate {

    if (s_instance == null) {
      s_instance = new LAppDelegate();
    }

    return s_instance;
  }


  /**
   * Live2D 표정 변경
   */
  public setExpression(expressionId: string): void {

    if (
      this._subdelegates &&
      this._subdelegates.length > 0
    ) {
      this._subdelegates[0].setExpression(expressionId);
    }

  }


  /**
   * Singleton release
   */
  public static releaseInstance(): void {

    if (s_instance != null) {
      s_instance.release();
    }

    s_instance = null;
  }


  /**
   * Pointer began
   */
  private onPointerBegan(e: PointerEvent): void {

    for (
      let i = 0;
      i < this._subdelegates.length;
      i++
    ) {

      this._subdelegates[i].onPointBegan(
        e.pageX,
        e.pageY
      );

    }
  }


  /**
   * Pointer moved
   */
  private onPointerMoved(e: PointerEvent): void {

    for (
      let i = 0;
      i < this._subdelegates.length;
      i++
    ) {

      this._subdelegates[i].onPointMoved(
        e.pageX,
        e.pageY
      );

    }
  }


  /**
   * Pointer ended
   */
  private onPointerEnded(e: PointerEvent): void {

    for (
      let i = 0;
      i < this._subdelegates.length;
      i++
    ) {

      this._subdelegates[i].onPointEnded(
        e.pageX,
        e.pageY
      );

    }
  }


  /**
   * Pointer cancel
   */
  private onPointerCancel(e: PointerEvent): void {

    for (
      let i = 0;
      i < this._subdelegates.length;
      i++
    ) {

      this._subdelegates[i].onTouchCancel(
        e.pageX,
        e.pageY
      );

    }
  }


  /**
   * Resize
   */
  public onResize(): void {

    if (!this._subdelegates) {
      return;
    }

    for (
      let i = 0;
      i < this._subdelegates.length;
      i++
    ) {

      this._subdelegates[i].onResize();

    }
  }


  /**
   * Main loop
   */
  public run(): void {

    const loop = (): void => {

      if (s_instance == null) {
        return;
      }

      LAppPal.updateTime();

      for (
        let i = 0;
        i < this._subdelegates.length;
        i++
      ) {

        this._subdelegates[i].update();

      }

      requestAnimationFrame(loop);

    };

    loop();
  }


  /**
   * Release
   */
  private release(): void {

    this.releaseEventListener();

    this.releaseSubdelegates();

    CubismFramework.dispose();

    this._cubismOption = null;
  }


  /**
   * Remove event listeners
   */
  private releaseEventListener(): void {

    document.removeEventListener(
      'pointerdown',
      this.pointBeganEventListener
    );

    document.removeEventListener(
      'pointermove',
      this.pointMovedEventListener
    );

    document.removeEventListener(
      'pointerup',
      this.pointEndedEventListener
    );

    document.removeEventListener(
      'pointercancel',
      this.pointCancelEventListener
    );
  }


  /**
   * Release subdelegates
   */
  private releaseSubdelegates(): void {

    if (!this._subdelegates) {
      return;
    }

    for (
      let i = 0;
      i < this._subdelegates.length;
      i++
    ) {

      this._subdelegates[i].release();

    }

    this._subdelegates.length = 0;
    this._subdelegates = null;
  }


  /**
   * Initialize
   */
  public initialize(): boolean {

    this.initializeCubism();

    this.initializeSubdelegates();

    this.initializeEventListener();

    return true;
  }


  /**
   * Initialize event listeners
   */
  private initializeEventListener(): void {

    this.pointBeganEventListener =
      this.onPointerBegan.bind(this);

    this.pointMovedEventListener =
      this.onPointerMoved.bind(this);

    this.pointEndedEventListener =
      this.onPointerEnded.bind(this);

    this.pointCancelEventListener =
      this.onPointerCancel.bind(this);


    document.addEventListener(
      'pointerdown',
      this.pointBeganEventListener,
      {
        passive: true
      }
    );

    document.addEventListener(
      'pointermove',
      this.pointMovedEventListener,
      {
        passive: true
      }
    );

    document.addEventListener(
      'pointerup',
      this.pointEndedEventListener,
      {
        passive: true
      }
    );

    document.addEventListener(
      'pointercancel',
      this.pointCancelEventListener,
      {
        passive: true
      }
    );
  }


  /**
   * Initialize Cubism
   */
  private initializeCubism(): void {

    LAppPal.updateTime();

    this._cubismOption.logFunction =
      LAppPal.printMessage;

    this._cubismOption.loggingLevel =
      LAppDefine.CubismLoggingLevel;

    CubismFramework.startUp(
      this._cubismOption
    );

    CubismFramework.initialize();
  }


  /**
   * Create and initialize canvases
   */
  private initializeSubdelegates(): void {

    /*
     * =====================================================
     * IMPORTANT
     * =====================================================
     *
     * Live2D canvas는 React UI보다 항상 뒤에 있어야 한다.
     *
     * 모바일 브라우저에서 canvas가 React UI를 덮는 문제를
     * 방지하기 위해 별도의 stacking layer를 만든다.
     *
     * =====================================================
     */


    // body 기본 설정

    document.body.style.margin = '0';

    document.body.style.padding = '0';

    document.body.style.width = '100%';

    document.body.style.height = '100%';

    document.body.style.overflow = 'hidden';


    /*
     * Live2D 전용 layer
     */

    let live2dLayer =
      document.getElementById('live2d-layer');


    if (!live2dLayer) {

      live2dLayer =
        document.createElement('div');

      live2dLayer.id =
        'live2d-layer';


      live2dLayer.style.position =
        'fixed';

      live2dLayer.style.left =
        '0';

      live2dLayer.style.top =
        '0';

      live2dLayer.style.width =
        '100vw';

      live2dLayer.style.height =
        '100vh';


      /*
       * React보다 뒤
       */

      live2dLayer.style.zIndex =
        '0';


      /*
       * UI 클릭 방해 금지
       */

      live2dLayer.style.pointerEvents =
        'none';


      /*
       * stacking context
       */

      live2dLayer.style.isolation =
        'isolate';


      document.body.appendChild(
        live2dLayer
      );
    }


    /*
     * Canvas 개수
     */

    this._canvases.length =
      LAppDefine.CanvasNum;

    this._subdelegates.length =
      LAppDefine.CanvasNum;


    /*
     * Canvas 생성
     */

    for (
      let i = 0;
      i < LAppDefine.CanvasNum;
      i++
    ) {

      const canvas =
        document.createElement('canvas');


      this._canvases[i] =
        canvas;


      /*
       * 화면 전체
       */

      canvas.style.width =
        '100vw';

      canvas.style.height =
        '100vh';


      /*
       * 고정 위치
       */

      canvas.style.position =
        'absolute';

      canvas.style.left =
        '0';

      canvas.style.top =
        '0';


      /*
       * Live2D layer 안에서는 0
       */

      canvas.style.zIndex =
        '0';


      /*
       * React UI가 터치 이벤트를 받도록
       */

      canvas.style.pointerEvents =
        'none';


      canvas.style.display =
        'block';


      canvas.style.margin =
        '0';

      canvas.style.padding =
        '0';


      /*
       * canvas 자체가 UI를 만들지 않도록
       */

      canvas.style.maxWidth =
        'none';

      canvas.style.maxHeight =
        'none';


      /*
       * layer 안에 넣는다.
       *
       * 기존:
       * document.body.appendChild(canvas)
       *
       * 변경:
       * live2dLayer.appendChild(canvas)
       */

      live2dLayer.appendChild(
        canvas
      );
    }


    /*
     * Subdelegate 초기화
     */

    for (
      let i = 0;
      i < this._canvases.length;
      i++
    ) {

      const subdelegate =
        new LAppSubdelegate();


      subdelegate.initialize(
        this._canvases[i]
      );


      this._subdelegates[i] =
        subdelegate;
    }


    /*
     * WebGL context 확인
     */

    for (
      let i = 0;
      i < LAppDefine.CanvasNum;
      i++
    ) {

      if (
        this._subdelegates[i]
          .isContextLost()
      ) {

        CubismLogError(
          `The context for Canvas at index ${i} was lost, possibly because the acquisition limit for WebGLRenderingContext was reached.`
        );

      }

    }
  }


  /**
   * Constructor
   */
  private constructor() {

    this._cubismOption =
      new Option();

    this._subdelegates =
      new Array<LAppSubdelegate>();

    this._canvases =
      new Array<HTMLCanvasElement>();
  }


  /**
   * Cubism option
   */
  private _cubismOption: Option;


  /**
   * Canvas
   */
  private _canvases:
    Array<HTMLCanvasElement>;


  /**
   * Subdelegates
   */
  private _subdelegates:
    Array<LAppSubdelegate>;


  /**
   * Event listeners
   */
  private pointBeganEventListener:
    (this: Document, ev: PointerEvent) => void;


  private pointMovedEventListener:
    (this: Document, ev: PointerEvent) => void;


  private pointEndedEventListener:
    (this: Document, ev: PointerEvent) => void;


  private pointCancelEventListener:
    (this: Document, ev: PointerEvent) => void;
}