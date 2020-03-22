---
title: "re training sustain"
date: 2020-03-23 04:51:28 -0400
categories: Study 
---
Tensorflow 로 학습을 시키다 보면 HW / 시간의 제약으로 한번 끊고 학습을 다시 시켜야할 경우가 생긴다
이랄떠  save.restore 라는 함수를 사용해서 연속해서 학습을 시키면 된다

아래와 같은 코드로 meta, checkpoint 파일을 이어서 학습을 시키면 된다. 


dir_restore = 'model/20190703_01/model-5'


sess.run(model.init_all)
saver.restore(sess, dir_restore)
