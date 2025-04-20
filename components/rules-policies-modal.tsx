"use client"

import type React from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface RulesPoliciesModalProps {
  trigger: React.ReactNode
}

export default function RulesPoliciesModal({ trigger }: RulesPoliciesModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">Rules & Policies</DialogTitle>
        </DialogHeader>
        <ScrollArea className="mt-4 max-h-[60vh] pr-4">
          <div className="space-y-6">
            <section>
              <h3 className="text-base font-medium mb-2">📄 เงื่อนไขการจองห้อง (Terms & Conditions)</h3>
              <ul className="space-y-2 text-sm">
                <li>• ผู้ใช้งานต้องเข้าสู่ระบบก่อนทำการจองห้องทุกครั้ง</li>
                <li>• การจองจะถือว่าสำเร็จเมื่อได้รับสถานะ "อนุมัติ" เท่านั้น</li>
                <li>• หากไม่สามารถเข้าร่วมตามเวลาที่จอง กรุณายกเลิกล่วงหน้าอย่างน้อย 1 ชั่วโมง</li>
                <li>• การไม่มาใช้ห้องโดยไม่แจ้งล่วงหน้าเกิน 2 ครั้ง อาจถูกระงับสิทธิ์การจองชั่วคราว</li>
                <li>• ห้องนี้มีไว้เพื่อการศึกษา ประชุม หรือกิจกรรมที่ได้รับอนุญาตเท่านั้น</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-medium mb-2">📌 กฎระเบียบในการใช้ห้อง (Rules & Regulations)</h3>
              <ul className="space-y-2 text-sm">
                <li>❌ ห้ามนำอาหารหรือเครื่องดื่มเข้ามาในห้อง</li>
                <li>🧹 กรุณารักษาความสะอาดหลังการใช้งาน</li>
                <li>🔇 หลีกเลี่ยงการส่งเสียงดังรบกวนผู้อื่น</li>
                <li>⏰ ออกจากห้องให้ตรงเวลา ตามช่วงเวลาที่จองไว้</li>
                <li>⚠️ ห้ามปรับเปลี่ยนอุปกรณ์หรือเฟอร์นิเจอร์โดยไม่ได้รับอนุญาต</li>
                <li>🛑 การใช้ห้องในทางที่ผิดกฎ อาจถูกระงับสิทธิ์การใช้งานทันที</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-medium mb-2">📄 Terms & Conditions</h3>
              <ul className="space-y-2 text-sm">
                <li>• Users must log in before making any room reservations</li>
                <li>• Reservations are only considered successful when marked as "Approved"</li>
                <li>• If unable to attend, please cancel at least 1 hour in advance</li>
                <li>• Failing to show up without notice more than 2 times may result in temporary suspension</li>
                <li>• This room is for educational purposes, meetings, or authorized activities only</li>
              </ul>
            </section>

            <section>
              <h3 className="text-base font-medium mb-2">📌 Rules & Regulations</h3>
              <ul className="space-y-2 text-sm">
                <li>❌ No food or drinks allowed in the room</li>
                <li>🧹 Please keep the room clean after use</li>
                <li>🔇 Avoid making loud noises that disturb others</li>
                <li>⏰ Exit the room on time according to your reservation</li>
                <li>⚠️ Do not modify equipment or furniture without permission</li>
                <li>🛑 Improper use of the room may result in immediate suspension of privileges</li>
              </ul>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
