
---
title: "deeplearning Model for android.md"
date: 2020-07-12 23:55:33 -0400
categories: Andorid Coding 
---

DeepLearning  관련해서 공부하면서 결과물을 눈으로 보고 확인하고 싶어서 Android App 으로 산출물을 만들었습니다.
최대한 간단히 만든다고 만들었는데 UX 와 실력이 부족해서 아직은 목표대비는 부족 한것 같습니다.

시작하게된 계기는 AI 분야 공부하다가 이왕 하는거 그래도 구현해서 앱으로 까지 적용해 보자고 시작한게 앱 출시 까지 진행되었네요.
혹시나 시간되시면 S9 이상 단말에서  사용해보시고 피드백 주세요.

단점으론 AI 모델 연산량이 많아 생각보다 processing 시간이 오래 걸리네요 
바쁘시면 그런 이런것도 있구나 하고 지나가셔도 괜찮습니다.

카툰 Cartoon Torch 모델과 Super Resolution tflite inference 동작 하는데 재미가 있으실 겁니다
SR 기능으로 처리된 결과 이미지는 PC같이 화면에서 보면 구분이 쉽게 되는데 단말에선 차이가 크지 않네요.

앱 권한상으로도 사용자의 어떤 데이터도 별도로 저장하거나 서버로 보내지 않습니다.
On-Device AI 로 Android NN 을 활용 + Android Pytorch Model 을 동작하는데 
Android NN 은 GPU 에서 동작하지만 Torch Model 은 어디서 도는지는 봐야할것 같습니다.


Andorid NN 과 Pytroch Android 가 pixel image processing  처리를 위한 android app 이 조금 부족해서 찾아보느라 
약간의 수고가 있었습니다.


혹시 간단한 질문이나 설명이 필요하시면 댓글이나 메일 남겨 주십시요.
carpediem.jun7@gmail.com

Cartoon sample image #1
![sample2](https://user-images.githubusercontent.com/5698411/87249662-43853600-c49b-11ea-90df-8a5130f756b9.png)
Cartoon sample image #2
![그림2](https://user-images.githubusercontent.com/5698411/87249665-4a13ad80-c49b-11ea-9c0d-4b4814280c19.png)

Converted sample image
![Hongil](https://user-images.githubusercontent.com/5698411/87249669-526be880-c49b-11ea-99d6-1a1d1ce0c172.jpg)



https://play.google.com/store/apps/details?id=com.joonAI.AI_Filter

