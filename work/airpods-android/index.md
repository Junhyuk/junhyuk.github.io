---
layout: single
title: "Android에서 AirPods를 이해하고 제어하기"
permalink: /work/airpods-android/
description: "BLE 광고부터 AAP L2CAP 세션, 배터리의 신뢰도, ANC 응답 검증과 Android 수명주기까지: AirPods Android 도우미 개발 기록."
author_profile: true
read_time: true
share: false
related: false
toc: true
toc_label: "이 페이지에서"
toc_sticky: true
lang: ko
---

{% assign source_repo = 'https://github.com/Junhyuk/airpod_controller_android' %}
{% assign play_url = 'https://play.google.com/store/apps/details?id=com.dgy.and_airpod&hl=ko&gl=KR' %}

<link rel="stylesheet" href="{{ '/work/airpods-android/assets/article.css' | relative_url }}">

<div lang="ko" markdown="1">

<p class="airpods-intro" lang="ko">음악은 잘 들리는데, 케이스 배터리는 어디서 확인할까? Android에서 AirPods를 쓰며 생기는 이 작은 불편을, Bluetooth 통신과 상태 관리의 문제로 풀어 본 프로젝트입니다.</p>

**에어팟 도우미**는 연결 상태와 배터리 정보를 보여 주고, 지원 환경에서는 듣기 모드와 대화 인지를 제어하는 Android 앱입니다. 가장 신경 쓴 부분은 버튼의 개수보다 **“이 값은 어느 기기에서, 언제 받았고, 지금도 믿을 수 있는가?”**를 화면과 코드에서 일관되게 설명하는 일이었습니다.

이 글은 2026년 10월의 구현을 설명합니다. 소스에 구현된 기능, 과거 실제 화면에서 확인한 상태, 아직 실기기 검증이 필요한 항목을 구분했습니다. Apple이 제작하거나 인증한 앱이 아닙니다.

<div class="airpods-cta">
  <a class="btn btn--primary" href="{{ play_url }}">Google Play에서 앱 보기</a>
  <a class="btn" href="#try-it">직접 빌드해 보기</a>
</div>

2026년 10월 24일 기준, Google Play 공개 목록에서 설치 가능한 버전은 1.3입니다. 최적화된 1.3.1 (versionCode 6) AAB는 Play Console에 업로드해 저장했고, Google의 빠른 검사를 통과했습니다. 기존 unsupported-API 경고는 수정 완료로 표시하지 않고 확인된 내용 그대로 인정했습니다. **최종 심사 제출은 아직 확인되지 않았습니다**: Console 개요는 `NOT_SUBMITTED` 상태이며 새 제출 기록도 보이지 않아, 이 버전이 심사 중이거나 공개됐다고 말할 수 없습니다. 본문의 GitHub 코드 링크는 **비공개 저장소로, 접근 권한이 있는 독자만 열 수 있습니다**. 핵심 흐름과 코드 예제는 이 페이지 안에서도 읽을 수 있도록 설명했습니다.

## 무엇을 만들었고, 무엇이 달라지나

연결된 이어폰의 왼쪽·오른쪽·케이스 배터리를 구분하고, 받지 못한 값은 `0%` 대신 **확인 불가**로 표시합니다. 케이스가 닫혀 새 값을 주지 않으면 마지막 수신 시각을 함께 보여 줍니다. 주변에서 발견한 AirPods의 대략적인 광고 값은 별도 영역에 둡니다. 사용자는 현재 연결된 내 기기의 값과 주변 기기의 값을 혼동하지 않고, 새로고침을 해도 값이 갱신되지 않은 이유를 이해할 수 있습니다.

현재 소스에 구현된 범위는 다음과 같습니다. 아래 표의 “구현”은 모든 AirPods 모델·펌웨어·Android 기기에서 동작한다는 의미가 아닙니다.

| 기능 | 구현 내용과 경계 |
| --- | --- |
| 연결·권한 안내 | Android 12/API 31 이상에서 Bluetooth 권한, 연결된 A2DP/HFP 기기, 선택 기기를 확인 |
| 배터리 | AAP 배터리 알림 파싱, 식별된 케이스 광고 처리, 마지막 수신 값·시각 보관 |
| 주변 AirPods | 공개 BLE 제조사 광고의 약 10% 단위 값을 별도 표시. 연결 기기와 동일하다고 추정하지 않음 |
| 듣기 모드 | 끔·노이즈 캔슬링·주변음 허용·적응형 명령과 새 응답 확인. 모델과 실행 환경에 따라 제한 |
| 대화 인지 | Pro 코드 경로에서 설정·응답 확인과 제한된 재연결 후 읽기 구현 |
| 홈 화면·알림 | 위젯에 상태와 동작 진행 상태 표시, 연결된 기기의 모니터링 알림과 중지 동작 |
| 한국어·영어 | 앱 내 언어 전환 및 상태·오류·복구 안내 |

기본 연결 기능과 AAP 제어의 지원 범위는 다릅니다. **현재 AAP 전송은 Android 17/API 37에만 허용**합니다. Android 12 이상이라는 설치 조건만으로 ANC 제어가 가능해지는 것은 아닙니다. 실제 게이트는 [`SupportPolicy`와 결과 모델]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/Models.kt)에 있습니다.

## 실제 화면으로 보는 배터리와 연결 안내

아래는 **이전 Free 1.1/versionCode 2의 실제 앱 화면**입니다. 현재 개발 소스의 최신 UI 시연이 아닙니다. 시스템 바를 제거하고 기기 이름을 일반 이름으로 치환한 기존 공개 준비 이미지만 사용했습니다. 수신 값과 확인 불가 상태는 원래대로 남겼습니다.

<div class="airpods-gallery">
  <figure>
    <a href="{{ '/work/airpods-android/assets/battery-overview-v1-1.png' | relative_url }}"><img src="{{ '/work/airpods-android/assets/battery-overview-v1-1.png' | relative_url }}" width="1080" height="1920" loading="lazy" alt="이전 Free 앱에서 왼쪽과 오른쪽 배터리 92%, 케이스 확인 불가, 수신 시각을 표시한 화면"></a>
    <figcaption>과거 실제 수신 예: 좌·우 92%, 케이스 확인 불가. 이 한 장으로 케이스 수신이나 모드 변경 성공을 주장하지 않습니다.</figcaption>
  </figure>
  <figure>
    <a href="{{ '/work/airpods-android/assets/connection-guide-v1-1.png' | relative_url }}"><img src="{{ '/work/airpods-android/assets/connection-guide-v1-1.png' | relative_url }}" width="1080" height="1920" loading="lazy" alt="Bluetooth 설정에서 기존 AirPods를 연결하거나 새 기기를 페어링하도록 안내하는 이전 Free 앱 대화상자"></a>
    <figcaption>기존 기기 연결과 새 기기 페어링을 나눠 안내합니다. 앱이 직접 오디오 연결을 대신하지는 않습니다.</figcaption>
  </figure>
</div>

### 이전 개발 버전의 짧은 동작 영상

<figure class="airpods-video">
  <video controls playsinline preload="metadata" width="540" height="800" aria-label="2026년 10월 7일 이전 Pro 개발 버전의 주변 배터리 확인 시작과 앱 스크롤 영상. 기기 이름과 시스템 영역을 제외한 무음 발췌">
    <source src="{{ '/work/airpods-android/assets/app-demo-2026-10-07.mp4' | relative_url }}" type="video/mp4">
    <a href="{{ '/work/airpods-android/assets/app-demo-2026-10-07.mp4' | relative_url }}">무음 데모 영상 내려받기</a>
  </video>
  <figcaption>2026년 10월 7일의 이전 Pro 개발 녹화에서 약 7초를 발췌했습니다. 정확한 앱 버전 코드는 확인하지 못했습니다. 주변 배터리 확인을 시작한 뒤 배터리 영역으로 스크롤합니다. 개인정보가 있던 상단과 시스템 영역은 잘라 냈고 오디오·원본 메타데이터는 제거했습니다. 표시된 케이스 89%는 화면에도 적힌 <strong>마지막 수신 값</strong>입니다. 최신 전력 수정, ANC 변경, 대화 인지 변경의 성공 시연은 아닙니다.</figcaption>
</figure>

## Android와 AirPods는 어떤 경로로 통신할까

“Bluetooth로 연결됐다”는 한 문장에는 서로 다른 경로가 섞여 있습니다. 이 프로젝트에서는 다음 세 경로를 나눕니다.

| 경로 | 역할 | 여기서 알 수 없는 것 |
| --- | --- | --- |
| Android의 A2DP/HFP 프로필 | 음악·통화 연결 상태 확인, 연결된 기기 선택의 근거 | 앱의 AAP 명령 성공 여부 |
| BLE 제조사 광고 | 주변에서 방송하는 모델·대략적인 배터리 정보 관찰 | 공개 광고만으로 현재 연결 기기의 신원 확인 |
| BR/EDR L2CAP의 AAP 세션 | 배터리·설정 알림 수신, 듣기 모드·대화 인지 제어 | 모든 모델에서의 호환성과 명령 성공을 자동 보장하지 않음 |

앱은 오디오를 중계하지 않습니다. Android가 관리하는 A2DP/HFP 연결을 먼저 확인하고, 별도의 L2CAP 채널로 AAP 메시지를 주고받습니다. 여기서 AAP는 프로젝트가 다루는 Apple Accessory Protocol 메시지 경로를 뜻하며, 일반적인 BLE GATT 특성에 값을 쓰는 방식과 다릅니다.

### 1. 권한과 실제 연결을 먼저 확인한다

Android 12 이상에서는 검색에 `BLUETOOTH_SCAN`, 이미 페어링된 기기와의 통신에 `BLUETOOTH_CONNECT` 런타임 권한이 필요합니다. 앱은 Bluetooth가 켜져 있는지, 플랫폼이 현재 연결됐다고 보고하는 기기인지, 선택 기기가 여전히 같은지 확인합니다. 이름이 비슷한 광고나 저장된 목록만으로 제어 대상을 정하지 않습니다. 권한의 기준은 [Android Bluetooth 권한 문서](https://developer.android.com/develop/connectivity/bluetooth/bt-permissions)를 따릅니다.

### 2. L2CAP PSM 4097에 AAP 채널을 연다

소스의 AAP 채널은 `PSM = 0x1001`, 즉 십진수 **4097**을 사용합니다. Android 17 경로에서는 `hiddenapibypass`를 통해 `createInsecureL2capSocket`을 호출합니다. 이름에 `Insecure`가 들어가는 소켓을 사용하므로 이 경로를 독립적인 암호학적 인증 채널이라고 설명해서는 안 됩니다.

공개 API에 `BluetoothSocketSettings`가 있다는 이유만으로 이 BR/EDR 채널을 대체할 수 있는 것도 아닙니다. 공식 문서는 L2CAP PSM 설정을 `TYPE_LE`와 128–255 범위로 설명합니다. 프로젝트가 요구하는 전송 방식과 PSM이 이 공개 설정 범위와 맞지 않는다는 점이 호환성 제약의 핵심입니다. [공식 API 설명](https://developer.android.com/reference/android/bluetooth/BluetoothSocketSettings), [현재 Android 전송 구현]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/AndroidAirPodsPlatform.kt)을 함께 참고할 수 있습니다.

이것은 현 구현의 제한된 호환성 경로입니다. 향후 OS에서도 유지되거나 Google Play 심사가 승인된다는 보장은 아닙니다.

### 3. Handshake 후 알림을 구독한다

순서는 **소켓 연결 → 읽기 스레드 시작 → handshake 전송·수락 확인 → 알림 구독 → 배터리·모드·기기 정보 수신**입니다. 배터리 읽기는 듣기 모드 알림이 도착해야만 성공하도록 묶지 않았습니다. 이어폰 배터리를 받았는데 모드 알림이 늦는 상황을 배터리 실패로 처리하지 않기 위해서입니다.

프로젝트의 패킷 정의에서 가져온 핵심 값은 다음과 같습니다.

```kotlin
const val PSM = 0x1001

val handshake = byteArrayOf(
    0x00, 0x00, 0x04, 0x00,
    0x01, 0x00, 0x02, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
)
```

이후 `0x0F` 알림 활성화 메시지, `0x4D` 초기화 메시지, 필요한 경우 `0x30` 키 요청을 보냅니다. 메시지 식별자와 바이트 정의의 기준은 [`AirPodsAapPackets.kt`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/AirPodsAapPackets.kt)이며, 순서와 시간 제한은 [`AapSession.kt`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/AapSession.kt)에 있습니다. Apple의 공식 공개 프로토콜 명세로 제시하는 내용은 아닙니다.

### 4. 헤더·길이·메시지 종류를 확인해 상태로 바꾼다

일반 알림은 `04 00 04 00` 헤더 다음 두 바이트를 리틀 엔디언 메시지 종류로 읽습니다. Handshake 응답은 별도의 `01 00 04 00` 헤더를 검사합니다. 예를 들어 배터리는 종류 `0x04`, 제어 응답은 `0x09`, 기기 정보는 `0x1D`, 키 응답은 `0x31`로 분기합니다.

```kotlin
fun messageType(packet: ByteArray): Int? {
    if (packet.size < 6 ||
        !packet.copyOfRange(0, 4).contentEquals(byteArrayOf(4, 0, 4, 0))) return null
    return (packet[4].toInt() and 0xFF) or
        ((packet[5].toInt() and 0xFF) shl 8)
}
```

위 코드는 실제 함수의 줄바꿈만 조정한 발췌입니다. 배터리 파서는 항목 수와 전체 길이를 추가 검사하고, 제어 파서는 기대하는 정확한 길이를 검사합니다. **프로토콜 메시지의 검증과 소켓 스트림의 경계 처리는 별개**입니다. 현재 전송 구현은 한 번의 `read()` 결과를 파서에 넘기므로, 분할·결합 수신에 대한 실기기 통합 검증은 별도로 필요합니다.

## 어려웠던 점 1: 배터리 숫자에 신뢰도를 붙이기

### 공개 BLE 광고와 연결된 내 기기를 구분하기

[`NearbyAdvertisement`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/NearbyAdvertisement.kt)는 Apple 제조사 데이터 안의 type/length/value 메시지를 순회합니다. 알려진 페어링 광고에서 모델과 좌·우·케이스 배터리 니블을 읽고, `0..10`을 `0..100%`로 변환합니다. 이 때문에 이 값은 대략 10% 단위이며, 알 수 없는 코드는 `null`입니다.

주변에 다른 사람의 AirPods가 있어도 광고는 들어올 수 있습니다. 따라서 **공개 광고는 근처 후보 정보**이고, 현재 연결된 기기의 정밀 배터리로 합치지 않습니다. 연결 기기의 AAP 알림에서 읽은 배터리와 별도의 화면·상태 모델을 사용합니다. 회귀 fixture에서는 연결 기기와 관계없는 광고 20개를 보내도 Bluetooth profile 조회가 0회였고, 일치 가능성이 있는 광고는 실제 연결 대상을 다시 확인한 뒤에만 받도록 검사했습니다. 이 카운트는 앱의 조회 순서를 검증한 것이지 무선 전력 측정은 아닙니다.

케이스에 대해서는 한 단계 더 있습니다. 열린 AAP 세션에서 받은 세션 전용 키가 있으면, BLE의 회전 주소가 그 IRK에 대응하는지 Bluetooth `ah()` 계산으로 확인하고 private proximity payload를 해독합니다. 그 결과만 `IDENTIFIED_BLE` 출처로 받아들입니다. 이것은 **세션 키에 대응하는 기기로 식별했다**는 뜻이며, 공개 광고 자체가 인증됐다는 뜻은 아닙니다. 키를 디스크에 보관하거나 로그에 출력하지 않는 구현은 [`IdentifiedCaseBattery.kt`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/IdentifiedCaseBattery.kt)에서 확인할 수 있습니다.

### 없는 값, 이전 값, 방금 받은 값을 나누기

AAP 배터리 메시지는 항목 수 다음에 5바이트 단위 엔트리가 이어집니다. 컴포넌트 ID `4`는 왼쪽, `2`는 오른쪽, `8`은 케이스, `1`은 단일 기기 값으로 처리합니다. 퍼센트가 `100`을 넘거나 상태가 unavailable이면 `null`로 남깁니다. 한쪽만 들어온 업데이트를 다룰 때도 “응답에 없었다”와 “응답에서 명시적으로 확인 불가였다”를 구분할 수 있도록 파싱 결과에 컴포넌트 집합을 함께 둡니다.

화면은 다음 세 상태를 구분합니다.

| 상태 | 화면에서의 의미 |
| --- | --- |
| 유효한 귀 배터리 알림 수신 | 값과 실제 수신 시각을 현재 상태로 표시 |
| 과거 값만 존재 | 마지막 수신 값과 시각 표시 |
| 받은 적 없음·유효하지 않음 | 확인 불가, 케이스 열기 등 복구 안내 |

같은 퍼센트의 유효한 왼쪽·오른쪽·단일 이어폰 수신도 새로운 관찰입니다. 실제 수신 시각과 이어폰별 이력을 갱신하고, 신선도 타이머도 다시 시작합니다. 화면 내용이 같을 때 알림과 위젯의 중복 표시는 합치지만, 이 표시 최적화가 이력의 실제 수신 시각을 되돌리지는 않습니다. 케이스만 온 메시지, unknown/unavailable 값, 캐시만 돌려준 읽기, 듣기 모드 메시지, 주변 BLE 광고는 **새 귀 배터리 수신**으로 세지 않습니다.

사용자가 새로고침을 눌렀다는 사실만으로 과거 값을 “현재”로 승격시키지 않습니다. 저장 시각 외에도 단조 시각과 수신 버전을 확인해 요청 뒤 실제 새 응답이 왔는지 판정합니다. 오래된 값은 마지막 실제 수신 시각을 유지하며 과거 값으로 표시합니다. 관련 구현은 [`AirPodsRepository.kt`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/AirPodsRepository.kt), [`EarBatteryHistory.kt`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/EarBatteryHistory.kt), [`AirPodsPresentation.kt`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/AirPodsPresentation.kt)를 참고하세요.

## 어려웠던 점 2: ANC 버튼을 누른 것과 바뀐 것을 구분하기

설정 메시지를 소켓에 썼다는 것만으로 UI에 성공을 표시하면 안 됩니다. 쓰기가 끝나기 전에 예전 응답이 도착할 수 있고, 큐에 과거의 같은 모드가 남아 있을 수도 있습니다.

프로젝트는 **최종 안전 검사 직후, 패킷을 쓰기 대상으로 승인하는 순간** 수신 sequence와 단조 시각을 기록합니다. 그 이후의 응답이며 요청한 모드와 값이 같아야 성공입니다. 단순히 쓰기 함수가 반환한 시각을 기준으로 삼으면, 블로킹 쓰기 도중 받은 정당한 응답을 놓칠 수 있기 때문입니다.

```kotlin
events.clear()
boundary = ModeSendBoundary(sequence.get(), System.nanoTime())

// 실제 응답 검사에서 사용하는 두 조건
frame.sequence > sent.sequence &&
    frame.receivedAtNanos > sent.admittedAtNanos
```

이 발췌의 앞부분은 `write`의 승인 콜백 안에 있고, 뒷부분은 이후 수신 큐 검사 안에 있습니다. 전체 제어 흐름은 [`sendAndVerify`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/AapSession.kt)를 참고하세요.

응답이 없으면 timeout, 다른 모드만 오면 mismatch, 기기 변경·연결 해제·권한 철회가 발생하면 해당 실패로 끝냅니다. 결과를 모르는 경우 현재 모드를 미확인으로 돌리고, 눌렀던 버튼을 그대로 성공 상태로 남기지 않습니다. 이미 같은 모드이면 불필요한 쓰기 대신 unchanged 결과를 구분합니다.

제어 전에는 선택 기기, 연결, API 지원 범위, 진행 중 작업뿐 아니라 오디오 상태도 확인합니다. 통화·오디오 사용 중이거나 안전 상태를 모르면 허용하지 않습니다. 취소는 작업 잠금을 기다리는 방식에만 의존하지 않고, 일반적인 블로킹 I/O는 소켓을 닫아 해제하도록 설계했습니다. 제한된 호환성 진단에서 모드를 잠깐 바꾸는 경우에는 원래 모드를 알고 있고 안전 조건이 맞을 때만 진행하며, 복원 실패를 별도 결과로 남깁니다.

여기에는 미묘한 예외가 있습니다. **임시 모드 변경이 이미 기기에 전달됐을 수 있는데 `write()`가 아직 반환하지 않은 순간** 취소가 들어오면, 즉시 소켓을 닫는 것이 오히려 원래 모드로 복원할 기회를 없앱니다. 현재 코드는 이 상태에서만 소유한 채널을 보존해 제한 시간 안에 복원을 시도합니다. 쓰기가 실제로 막혀 있다면 기존 I/O watchdog이 원래 기한에 채널을 닫습니다. “취소 후에도 복원은 끝내기”와 “막힌 I/O를 무한히 기다리지 않기”를 함께 검증하도록, 쓰기 콜백 안에서 취소를 발생시키는 결정적 회귀 테스트를 추가했습니다.

## 어려웠던 점 3: 대화 인지 응답이 매번 오지 않을 때

대화 인지(Conversation Awareness)는 듣기 모드와 같은 응답 패턴을 전제로 삼기 어렵습니다. 현재 코드는 제어 ID `0x28`로 설정을 한 번 보내고 알림을 다시 요청합니다. 기대한 값이 새로 보고돼야 확인 완료입니다.

설정 응답 timeout 시에는 일부 펌웨어가 연결 시에만 상태를 보고하는 경우를 다루기 위해, **같은 대상의 새 세션에서 최대 6초 예산으로 한 번 읽어 확인**하는 경로가 있습니다. 여기서는 설정을 다시 보내지 않습니다. 재연결을 무한 반복하거나 ANC를 시험 삼아 바꾸지도 않습니다. 취소·기기 변경·권한·연결 상태가 바뀌면 중단합니다. 확인하지 못하면 성공을 추정하지 않습니다. 구현은 [`readConversationBack`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/AirPodsRepository.kt)에 있습니다.

이것은 펌웨어 차이를 감안한 코드 경로이며, 모든 모델에서 대화 인지 변경을 실측 검증했다는 의미는 아닙니다.

## 어려웠던 점 4: Activity, 서비스, 위젯이 한 연결을 나누기

Activity가 사라졌다는 이유로 서비스가 사용 중인 세션을 닫으면 백그라운드 상태가 끊어집니다. 반대로 서비스가 종료됐는데 연결과 스캔이 남으면 필요 없는 작업이 지속됩니다.

[`AirPodsConnectionOwner`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/AirPodsConnectionOwner.kt)는 소유자 집합이 비어 있다가 첫 소유자가 들어올 때 repository를 시작하고, 마지막 소유자가 나갈 때 중지합니다. Activity와 foreground monitor가 같은 runtime을 공유하며, 위젯에는 시각이 붙은 마지막 snapshot을 게시합니다. 위젯의 과거 표시가 살아 있는 연결처럼 보이지 않도록 실행 상태를 함께 전달합니다.

장치 선택과 세션에는 generation 토큰을 사용합니다. 이전 세션에서 늦게 도착한 콜백이 새 기기의 상태를 덮어쓰지 못하게 하기 위해서입니다. 실행 중인 요청의 중복 승인과 취소도 별도로 관리합니다.

이 소유권 관리는 같은 앱 프로세스 안의 문제를 해결합니다. **서로 다른 앱이 동시에 같은 AirPods에 AAP 채널을 열려는 상황**은 별도로 봐야 합니다. 이번 실기기 읽기 점검에서도 기존 모니터 앱이 실행 중일 때는 handshake timeout이 났지만, 그 앱만 종료한 뒤 같은 읽기 시험이 성공했습니다. 한 번의 timeout만 보고 펌웨어 비호환이라고 결론 내리기 전에 다른 AAP 클라이언트와의 경쟁도 확인해야 한다는 사례입니다. 이 읽기 시험은 설정 쓰기나 연결 해제·재연결 검증을 대신하지 않습니다.

모니터링에는 `connectedDevice` foreground service 유형을 사용합니다. 실제 A2DP/HFP 연결, 사용자 설정, 알림 권한과 서비스 시작 조건을 확인하며 중지 동작을 제공합니다. Android는 foreground service 유형과 런타임 선행 조건을 요구합니다. 이것은 OS 동작 요건이고, 스토어 심사 승인과는 별도입니다. [Android foreground service 유형 문서](https://developer.android.com/develop/background-work/services/fgs/service-types#connected-device), [`AirPodsRuntime.kt`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/AirPodsRuntime.kt)를 참고하세요.

## 불필요한 백그라운드 작업 줄이기

연결된 AirPods가 보내는 유효한 AAP 귀 배터리 알림을 우선 사용합니다. **모니터링 중, 앱 화면이 보일 때와 백그라운드 foreground service가 유지될 때 모두 새 귀 배터리 알림이 2분 동안 없을 때만** 읽기 전용 fallback을 허용합니다. 새 알림이 오면 같은 퍼센트여도 조용한 시간 계산을 초기화하므로, 알림이 계속 들어오는 동안 fallback은 시작되지 않습니다.

- fallback은 건강한 AAP 세션이 열려 있으면 재사용하고, 세션이 닫혔으면 제한 예산 안에서 읽기 전용 준비를 합니다. 한 번에 최대 10초이며 작업 중 다른 사용자 제어나 새로고침이 있으면 공유 admission 규칙을 따릅니다. 설정 쓰기나 BLE 스캔은 하지 않습니다.
- Bluetooth 연결 초기화 때의 첫 읽기와 명시적으로 누른 사용자 읽기는 fallback quota와 별개입니다. 첫 읽기는 플랫폼이 확인한 실제 선택 기기의 연결 epoch마다 한 번만 허용합니다. AAP 채널을 미리 열었거나 Activity·서비스가 다시 만들어졌다는 이유만으로 물리 연결 epoch를 새로 만들지 않습니다.
- fallback 실패가 이어지면 재조회 간격을 5분 → 10분 → 20분으로 늘리고, 이후에는 20분 간격을 유지합니다. 한 프로세스에서 rolling hour당 최대 30회, 각 시작 사이 최소 2분으로 제한합니다.
- 케이스만 온 알림, 모르는 값, unavailable 값, 캐시된 값, 모드 알림, 무관한 BLE 광고는 귀 배터리 신선도를 갱신하지 않습니다. 케이스 새로고침은 이 자동 fallback과 별개인 사용자 동작입니다.
- Nearby는 사용자가 켰을 때만 `SCAN_MODE_LOW_POWER`로 스캔합니다. Nearby가 꺼져도 사용자가 시작한 케이스 새로고침은 화면 또는 foreground service 소유권과 권한이 있을 때 최대 10초 동안 임시 스캔할 수 있습니다. 오래된 Nearby 후보를 정리하는 15초 UI 타이머는 profile 조회나 AAP 재시도가 아닙니다.

서비스의 15초 주기 프로필 조회와 응답이 없을 때 다시 시작하던 초기 조회는 제거했습니다. 이 정책은 필요한 작업을 줄이기 위한 것으로, 실제 전류나 배터리 사용 시간 개선 수치는 측정하지 않았습니다. 코드 기준은 [`BatteryRefreshPolicy.kt`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/BatteryRefreshPolicy.kt), [`MonitoringPolicy.kt`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/MonitoringPolicy.kt), [`AirPodsRuntime.kt`]({{ source_repo }}/blob/main/app/src/main/java/com/example/airpot/AirPodsRuntime.kt)입니다.

## 검증 범위와 남아 있는 일

2026년 10월 24일 최종 소스 commit `9d493ae`의 clean-source 검증에서는 Free와 Pro 각각 **252개 단위 테스트**가 통과했고, lint 오류는 0개였습니다. stale-ear fallback, 실제 수신 시각을 보존하는 이력, 중복 UI 표시 억제, 취소·권한·연결 epoch 정책 등을 검사합니다. Android focused fixture 25개도 통과했습니다. 이 수치는 25회의 실 AirPods 제어 시험을 뜻하지 않으며, 모든 기기·펌웨어 호환성을 보장하지도 않습니다.

테스트가 통과해도 Bluetooth 무선 환경, 실제 소켓 경계, 모든 모델과 펌웨어의 동작을 대신 검증하지는 못합니다.

**초기 실기기 UI 점검에서는 ANC 쓰기가 `MODE_WRITE_TIMEOUT`으로 끝나 변경을 확인하지 못했습니다. 이후 양쪽 이어버드를 착용한 조건에서는 ANC와 주변음 허용 전환이 새 응답으로 확인됐고, 각각 약 1.1초와 1.5초가 걸렸습니다. 끔 요청에서는 응답을 기다리는 중 연결이 끊겼지만, 뒤이은 새 읽기에서 끔 상태가 확인됐습니다. 이 읽기 확인을 성공 응답으로 기록하지는 않았습니다. 휴대전화 Bluetooth를 끄고 켠 뒤 사용자가 AirPods를 수동 재연결했고, 새 AAP 소켓의 읽기에서 토글 전과 같은 노이즈 캔슬링 상태를 확인했습니다. 이 검증은 설정 쓰기 0회와 BLE 스캔 0회로 진행되어 캐시를 다시 적용한 결과가 아닙니다. 이는 수동 재연결 뒤 상태를 읽은 결과이며 앱의 자동 재연결을 뜻하지 않습니다. 이후 Transparency를 새로 쓰거나 복원하지 않았고, 다시 연결된 대상에 대한 최신 읽기는 확보하지 못해 현재 모드를 주장하지 않습니다.** 초기 실패를 모든 착용 조건에서의 영구적인 결론으로 일반화하지 않습니다. 이 결과는 해당 조건의 관찰이며 모든 모델의 동작을 보장하지 않습니다.

세션이 이미 닫혔는데 이전 `readReady` 캐시만 남은 경우를 위한 제한된 사용자 요청 복구도 추가했습니다. 오래된 캐시를 성공으로 간주하지 않고 명시적 읽기/제어 전에 실제 소유 세션을 확인합니다. 별도 UI fixture는 설정 쓰기 없이 통과했지만, 과거의 일시적인 선택 모드 표시 변화는 재현하지 못했습니다. 그 발생 원인은 아직 입증되지 않았고, 추측성 모드 캐시 수정은 추가하지 않았습니다.

Release는 앱 자체 진단 메시지의 포맷팅과 관찰 전용 패킷 해석을 끄되 실제 프로토콜 처리는 유지합니다. Android Bluetooth 시스템 로그 전체를 끄는 설정은 아닙니다. 앞선 제한 시간 로그 관찰에서는 Android Bluetooth 프로세스가 대부분을 차지했고 앱 자체 진단 이벤트는 0개였지만, 최종 유한 로그 검토는 아직 남아 있습니다. 이 관찰도 앱이 모든 시스템 로그를 없앴거나 전력을 얼마나 줄였다는 증거는 아닙니다.

실제 화면과 영상 자료는 이전 버전의 배터리 표시·주변 확인 시작·연결 안내에 한정해 제시했습니다. 최신 코드의 전체 기능에 대해 새 하드웨어 시험을 수행한 기록으로 해석하면 안 됩니다. 특히 다음은 계속 확인해야 합니다.

- Android 17의 기기별 비공개 API 호환성 및 향후 공개 API 대안
- 다양한 L2CAP 수신 경계와 펌웨어별 배터리·모드·대화 인지 알림
- 연결·해제·프로세스 재시작·권한 철회가 겹칠 때의 장시간 실기기 동작
- push-first stale-ear fallback 정책의 장시간 실제 전력 측정
- AirPods 연결이 끊겨 최종 30초 연결 상태 측정은 수행하지 못함

이 글은 전력 절감률이나 배터리 사용 시간 개선 수치를 제시하지 않습니다. 기존 앱의 [Google Play 공개 목록]({{ play_url }})과 최신 변경의 심사·배포 상태도 구분해야 합니다.

<span id="try-it"></span>

## 직접 빌드해서 사용해 보기

앱을 사용하려면 먼저 [Google Play 목록]({{ play_url }})에서 기기 호환성과 현재 배포 버전을 확인하세요. 기본 설치 대상은 Android 12 이상이며, AAP 기능은 Android 17/API 37로 제한됩니다.

소스 접근 권한이 있다면 [저장소의 설정 안내]({{ source_repo }}#readme)에 따라 직접 빌드할 수 있습니다. 현재 저장소는 비공개입니다. 아래 명령은 접근 권한이 있는 개발자를 위한 예제이며, 호환되는 JDK와 Android SDK 37이 필요합니다. 이번 검증 환경은 JDK 25를 사용했고, 앱의 Java/Kotlin 바이트코드 대상은 17입니다. `storeCapture`는 합성 화면을 만드는 별도 캡처 빌드이므로 실제 사용·배포용으로 선택하지 않습니다.

```bash
git clone git@github.com:Junhyuk/airpod_controller_android.git
cd airpod_controller_android
./gradlew :app:assembleProDebug
```

1. Android Bluetooth 설정에서 소유한 AirPods를 페어링하고 연결합니다.
2. 빌드한 앱을 설치하고 근처 기기 권한을 허용합니다.
3. 앱에서 현재 연결된 기기를 선택하고 배터리의 출처와 수신 시각을 확인합니다.
4. 케이스 값이 없으면 이어폰을 케이스에 넣고 뚜껑을 연 뒤 새로고침합니다. 응답이 없으면 과거 값 또는 확인 불가가 유지될 수 있습니다.
5. 지원 환경에서 통화·오디오 사용을 멈춘 상태로 듣기 모드 제어를 시도하고, 버튼 입력보다 **기기가 보고한 확인 결과**를 확인합니다.

문제를 재현할 때는 Android API, AirPods 모델·펌웨어, 재현 순서, 화면의 실패 종류를 함께 기록하면 도움이 됩니다. 기기 이름·MAC 주소·세션 키·원시 Bluetooth 덤프를 공개 이슈에 올리지는 마세요.

<div class="airpods-cta">
  <a class="btn btn--primary" href="{{ play_url }}">Google Play에서 앱 보기</a>
  <a class="btn" href="{{ source_repo }}">비공개 소스·빌드 안내</a>
</div>

## 코드와 참고 자료

프로토콜 값과 동작 설명의 일차 기준은 위에서 연결한 이 프로젝트의 코드입니다. Bluetooth/AAP 공개 구현을 이해할 때 참고한 [CAPod](https://github.com/d4rken-org/capod), [LibrePods](https://github.com/kavishdevar/librepods), [OpenPods](https://github.com/adolfintel/OpenPods)의 작성자와 GPL 라이선스 고지를 보존해야 합니다. 기존 앱 주석도 CAPod의 프로토콜 연구를 출처로 명시합니다. 원래 구현 전체의 파생 관계와 라이선스 검토가 완료됐다는 주장은 하지 않으며, 저장소 접근 권한이 코드 재사용 허락을 뜻하지도 않습니다. 자세한 상태는 [출처 고지]({{ source_repo }}/blob/main/THIRD_PARTY_NOTICES.md)에 있습니다. 이 글의 코드 발췌는 전체 구현과 라이선스 고지를 대체하지 않습니다.

[Engineering Work로 돌아가기]({{ '/about/#profile-engineering-work' | relative_url }}) · [홈]({{ '/' | relative_url }})

</div>
