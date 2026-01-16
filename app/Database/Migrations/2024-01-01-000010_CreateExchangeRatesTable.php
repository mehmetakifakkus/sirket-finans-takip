<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateExchangeRatesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'rate_date' => [
                'type' => 'DATE',
            ],
            'base_currency' => [
                'type'       => 'VARCHAR',
                'constraint' => 3,
                'default'    => 'TRY',
            ],
            'quote_currency' => [
                'type'       => 'VARCHAR',
                'constraint' => 3,
            ],
            'rate' => [
                'type'       => 'DECIMAL',
                'constraint' => '15,6',
            ],
            'source' => [
                'type'       => 'ENUM',
                'constraint' => ['manual', 'tcmb'],
                'default'    => 'manual',
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['rate_date', 'quote_currency']);
        $this->forge->addKey('rate_date');
        $this->forge->addKey('quote_currency');
        $this->forge->createTable('exchange_rates');
    }

    public function down()
    {
        $this->forge->dropTable('exchange_rates');
    }
}
