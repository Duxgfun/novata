# Novata - Huong Dan Su Dung & Wiki Huong Dan (User Guide)

Chao mung ban den voi Novata - Trinh hien thi song nhac va phat nhac toi gian danh rieng cho Windows 10 va Windows 11. Novata mang den phong cach toi gian (monochrome matte) ket hop cung giao dien the kinh mo (frosted glass) noi tren man hinh desktop.

---

## Muc Luc

1. [Tong Quan Ve Novata](#1-tong-quan-ve-novata)
2. [Cai Dat Va Khoi Chay Tu Ma Nguon](#2-cai-dat-va-khoi-chay-tu-ma-nguon)
3. [Huong Dan Su Dung Desktop Widget](#3-huong-dan-su-dung-desktop-widget)
4. [Tuy Chinh Giao Dien Song Nhac (Appearance)](#4-tuy-chinh-giao-dien-song-nhac-appearance)
5. [Trinh Phat Nhac Va Quan Ly Playlist](#5-trinh-phat-nhac-va-quan-ly-playlist)
6. [Tich Hop Discord Rich Presence](#6-tich-hop-discord-rich-presence)
7. [Bang Phim Tat & Thao Tac Nhanh](#7-bang-phim-tat--thao-tac-nhanh)
8. [Xu Ly Su Co Thuong Gap (Troubleshooting)](#8-xu-ly-su-co-thuong-gap-troubleshooting)

---

## 1. Tong Quan Ve Novata

Novata duoc thiet ke de hoa minh hoan toan vao man hinh lam viec cua ban:
- **Khong che khuat tam nhin**: Song nhac nam sat canh taskbar, khong co khung vien den thui, xuyen thau chuot (click-through) de ban choi game hoac lam viec ma khong bi vuong vi.
- **Bat am thanh thoi gian thuc**: Tu dong bat am thanh he thong (Spotify, YouTube tren Chrome/Edge, Apple Music, Game) hoac phat nhac truc tiep tu ung dung.
- **Doi moi voi nvt_0.4**: Bo sung Dang song lien tuc (Wave) voi co che vat lieu tach biet giua Vien tren cung (Top Crest Border) va Than ben trong (Inner Body), tuy bien tuy y giua Mau dac (Solid) va Kinh mo trong suot (Frosted Glass).

---

## 2. Cai Dat Va Khoi Chay Tu Ma Nguon

### 2.1. Yeu Cau He Thong
- He dieu hanh: Windows 10 hoac Windows 11 (64-bit).
- Moi truong: Node.js phien ban 18 tro len (khuyen nghi Node.js 20 hoac 24).

### 2.2. Cac Buoc Thuc Hien

1. **Clone hoac tai ma nguon**:
   ```bash
   git clone https://github.com/Duxgfun/novata.git
   cd novata/release
   ```

2. **Cai dat cac goi thu vien can thiet**:
   ```bash
   npm install
   ```

3. **Khoi chay ung dung**:
   ```bash
   npm start
   ```

4. **Dong goi file cai dat `.exe` (tuy chon)**:
   ```bash
   npm run build
   ```
   Sau khi build xong, file cai dat `.exe` se nam trong thu muc `dist/`.

---

## 3. Huong Dan Su Dung Desktop Widget

Desktop Widget la the phat nhac kinh mo noi tren man hinh desktop cua ban.

### 3.1. Cac Nut Chuc Nang Tren Widget
- **Play / Pause**: Phat hoac tam dung bai hat dang phat.
- **Next / Previous**: Chuyen den bai hat ke tiep hoac quay lai bai truoc.
- **Shuffle**: Bat/tat che do phat ngau nhien danh sach.
- **Repeat**: Chuyen doi giua cac che do lap: Lap toan bo danh sach, Lap 1 bai, hoac Khong lap.
- **Nut Move & Resize (icon 4 mui ten)**: Bat/tat che do chinh vi tri va kich thuoc widget.
- **Nut Settings (icon banh rang)**: Mo ngay bang cai dat Novata.

### 3.2. Che Do Chinh Vi Tri & Kich Thuoc (Move & Resize)
1. Nhan vao nut **Move & Resize** tren the widget (hoac nhan chuot phai vao widget).
2. Widget se hien vien vien net dut de ban biet dang o che do chinh sua:
   - **Di chuyen**: Giu chuot trai vao giua the widget va keo den bat ky vi tri nao ban muon tren man hinh.
   - **Chinh do to nho 8 huong**: Di chuot vao 4 canh hoac 4 goc cua widget (chuot se bien thanh mui ten resize), giu va keo de phong to hoac thu nho nhu mot cua so Windows thong thuong.
3. Nhan lai vao nut **Move & Resize** (hoac nhan chuot phai lan nua) de khoa vi tri va kich thuoc. Vi tri se duoc tu dong luu lai cho nhung lan mo app tiep theo.

---

## 4. Tuy Chinh Giao Dien Song Nhac (Appearance)

Mo bang **Settings** -> chon muc **Appearance** o menu ben trai de tuy bien toan dien:

### 4.1. Chon Dang Song (Waveform Type)
- **Vertical Bars (Cot song)**: Cac cot song nhac truyen thong nhay deu tu giua ra hai ben.
- **Continuous Wave (Dang song)**: Duong song uon luon mem mai lien tuc.

### 4.2. Tuy Chinh Chat Lieu Dang Song (Waveform Material)
Dang song co 2 thanh phan doc lap, moi thanh phan deu cho phep ban chon giua **Solid Color** hoac **Glass**:

1. **Top Crest Border (Vien tren cung cua song)**:
   - **Solid Color**: Chon mau vien tu bang mau (do, cam, xanh, trang...) va chinh do trong suot.
   - **Glass (Kinh mo trong suot)**: Vien kinh phan chieu trong suot, tuy chinh do mo (Blur) va do trong (Transparency).
2. **Wave Inner Body (Than ben trong cua song)**:
   - **Solid Color**: To kin vung ben duoi song thanh mot mang mau dong nhat (vi du: mau cam sang nhu thiet ke) voi do phu 100%.
   - **Glass (Kinh mo trong suot)**: Vung ben duoi bien thanh mang kinh trong suot mo ao, phan chieu hinh nen may tinh ma khong co bat ky mau nhan tao nao.

### 4.3. Tuy Chinh Chat Lieu The Widget (Widget Material)
- **Solid**: Be mat nham toi mau hien dai, phu hop phong cach matte toi gian.
- **Glass**: Mat kinh mo trong suot cao cap, co the dieu chinh muc do lam mo nen (Blur) va do trong suot theo y thich.

### 4.4. Thong So Kich Thuoc & Do Nhay
- **Spectrum Height**: Tang giam chieu cao cuc dai cua song nhac (tu 40px den 320px).
- **Audio Sensitivity**: Tang giam do nhay cua song theo bien do am luong cua bai hat.

---

## 5. Trinh Phat Nhac Va Quan Ly Playlist

### 5.1. Tim Kiem & Nghe Nhac Truc Tiep
1. Vao muc **Music Player** trong bang cai dat.
2. Go ten bai hat hoac ten nghe si vao o tim kiem roi nhan Enter.
3. Nhan vao ket qua de nghe ngay lap tuc.

### 5.2. Tao Va Quan Ly Playlists
- Vao muc **Playlists** de tao cac danh sach bai hat rieng biet (Study, Chill, Workout...).
- Them nhanh bai hat vao playlist bang cach nhan vao nut them playlist o the bai hat.
- Ho tro doi ten playlist va xoa playlist khi khong con su dung.

### 5.3. Nhac Mac Dinh Khoi Dong (Startup Auto-Play)
- Ban co the danh dau bat ky Playlist nao bang icon ngoi sao hoac chon trong muc cai dat de Novata tu dong phat ngay khi ban vua khoi dong ung dung ma khong can thao tac thu cong.

### 5.4. Tu Dong Dong Bo Voi Trinh Phat Ben Ngoai
- Neu ban mo nhac tren Spotify, YouTube (trinh duyet Chrome/Edge), Apple Music... Novata se tu dong bat ten bai hat, anh bia va tao song nhac phu hop voi am thanh he thong.

---

## 6. Tich Hop Discord Rich Presence

Novata cho phep ban khoe voi ban be tren Discord bai hat ban dang nghe:
1. Mo **Settings** -> muc **General**.
2. Bat cong tac **Discord Rich Presence**.
3. Discord cua ban se tu dong hien thi trang thai nghe nhac kem ten bai, nghe si, anh bia va thoi gian bai hat da phat.

---

## 7. Bang Phim Tat & Thao Tac Nhanh

| Thao tac | Chuc nang |
| :--- | :--- |
| **Nhan vao the Widget** | Tap trung vao the phat nhac |
| **Nhan chuot phai vao the Widget** | Bat/tat nhanh che do di chuyen & chinh size (Move & Resize) |
| **Keo tha chuot o the Widget** | Di chuyen vi tri the toi bat ky dau tren man hinh |
| **Keo cac canh/goc widget** | Thay doi chieu dai, chieu rong cua the widget |
| **Media Play / Pause tren ban phim** | Phat hoac dung bai hat |
| **Media Next / Previous tren ban phim** | Chuyen bai tiep theo hoac bai truoc |

---

## 8. Xu Ly Su Co Thuong Gap (Troubleshooting)

### 8.1. Song nhac khong nhay khi phat am thanh tren may tinh
- Kiem tra xem am luong tren may tinh cua ban co dang bi Mute khong.
- Neu dang nghe tu trinh duyet web, hay dam bao tab trinh duyet dang phat ra am thanh thuc te.
- Vao **Settings** -> **Appearance** va tang thanh truyen **Audio Sensitivity** len muc cao hon (vi du 0.8x - 1.2x).

### 8.2. Discord khong hien thi bai hat dang nghe
- Dam bao ung dung Discord da duoc mo truoc hoac mo cung luc voi Novata.
- Kiem tra trong phan **User Settings** -> **Activity Privacy** tren Discord xem tuy chon "Display current activity as a status message" da duoc bat hay chua.
- Tat va bat lai cong tac **Discord Rich Presence** trong phan cai dat cua Novata de ung dung ket noi lai duong ong IPC.

### 8.3. The Widget bi lech ra khoi man hinh
- Mo **Settings** -> **Appearance**, nhan nut **Reset Widget Position** de the widget tu dong quay ve vi tri mac dinh o goc duoi ben trai man hinh.
