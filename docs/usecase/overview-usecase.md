# UniLish - Use case tong quat

So do tong quat nay duoc rut ra tu menu web hien tai cua Learner app va Admin
Panel. Muc tieu la giu don gian: chi gom hai actor chinh va cac nhom tinh nang
lon, khong di vao tung flow con.

## Tinh nang tren web

### Learner app

- Trang chu: xem tong quan hoc tap, tien do va hoat dong gan day.
- Luyen giao tiep voi AI: luyen noi/chat voice theo chu de.
- Luyen nghe & noi: shadowing, dictation, luyen theo video/cue.
- Luyen de IELTS: xem bai luyen, lam attempt theo skill, xem ket qua.
- Khoa hoc de xuat: nhan goi y khoa hoc phu hop.
- Tat ca khoa hoc: tim/l loc va vao hoc course.
- Kiem tra trinh do: lam placement test va xem ket qua.
- Ho so/onboarding: chon ngon ngu, muc tieu, level va cap nhat profile.

### Admin panel

- Tong quan: xem dashboard quan tri.
- Ngon ngu: quan ly languages va cau hinh lien quan.
- Muc tieu & chien luoc: quan ly learning goals va skill weights.
- Khoa hoc: quan ly course, unit, lesson va lesson studio.
- Ngan hang cau hoi: tao, sua, review, publish/archive cau hoi.
- Bai kiem tra dau vao: tao/sua/publish placement test.
- Bai thi IELTS: tao/sua/publish de IELTS va skill practice.
- Nguoi dung: quan ly hoc vien.

## Use case tong quat

![Use case tong quat](overview-usecase.svg)

```mermaid
flowchart LR
    Learner["Learner"]
    Admin["Admin"]

    subgraph System["UniLish"]
        UC_Profile(["Quan ly tai khoan va ho so hoc"])
        UC_Home(["Xem tong quan hoc tap"])
        UC_Course(["Hoc khoa hoc"])
        UC_AIConversation(["Luyen giao tiep voi AI"])
        UC_Shadowing(["Luyen nghe & noi"])
        UC_Ielts(["Luyen de IELTS"])
        UC_Placement(["Kiem tra trinh do"])
        UC_Recommendation(["Nhan goi y khoa hoc"])

        UC_AdminDashboard(["Xem tong quan quan tri"])
        UC_ManageUsers(["Quan ly hoc vien"])
        UC_ManageCatalog(["Quan ly ngon ngu, muc tieu, khoa hoc"])
        UC_ManageLessons(["Quan ly noi dung bai hoc"])
        UC_ManageQuestions(["Quan ly ngan hang cau hoi"])
        UC_ManagePlacement(["Quan ly bai kiem tra dau vao"])
        UC_ManageIelts(["Quan ly bai thi IELTS"])
    end

    Learner --> UC_Profile
    Learner --> UC_Home
    Learner --> UC_Course
    Learner --> UC_AIConversation
    Learner --> UC_Shadowing
    Learner --> UC_Ielts
    Learner --> UC_Placement
    Learner --> UC_Recommendation

    Admin --> UC_AdminDashboard
    Admin --> UC_ManageUsers
    Admin --> UC_ManageCatalog
    Admin --> UC_ManageLessons
    Admin --> UC_ManageQuestions
    Admin --> UC_ManagePlacement
    Admin --> UC_ManageIelts

    UC_Recommendation -. "ho tro" .-> UC_Course
    UC_ManageCatalog -. "cung cap noi dung cho" .-> UC_Course
    UC_ManageLessons -. "cung cap bai hoc cho" .-> UC_Course
    UC_ManageQuestions -. "cung cap cau hoi cho" .-> UC_Course
    UC_ManageQuestions -. "cung cap cau hoi cho" .-> UC_Placement
    UC_ManageQuestions -. "cung cap cau hoi cho" .-> UC_Ielts
    UC_ManagePlacement -. "cau hinh" .-> UC_Placement
    UC_ManageIelts -. "cau hinh" .-> UC_Ielts
```
